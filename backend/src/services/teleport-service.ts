import { execSync } from 'child_process';
import logger from '../middleware/logger';

const TCTL_PATH = process.env.TCTL_PATH || '/usr/local/bin/tctl';
const TELEPORT_CLUSTER = process.env.TELEPORT_CLUSTER || 'teleport.localhost';
const TELEPORT_PROXY_URL = process.env.TELEPORT_PROXY_URL || `https://${TELEPORT_CLUSTER}`;
const TELEPORT_SSH_USER = process.env.TELEPORT_SSH_USER || 'ubuntu';

export interface TeleportNode {
  id: string;
  hostname: string;
  addr: string;
  labels: Record<string, string>;
  tunnel: boolean;
}

/**
 * Execute a tctl command and return stdout.
 * Throws on non-zero exit or missing binary.
 */
function runTctl(args: string): string {
  const cmd = `${TCTL_PATH} ${args}`;
  try {
    const output = execSync(cmd, {
      encoding: 'utf-8',
      timeout: 30_000,
      env: { ...process.env },
    });
    return output.trim();
  } catch (err: unknown) {
    const error = err as Error & { stderr?: string; status?: number };
    logger.error(`tctl command failed: ${cmd}`, {
      stderr: error.stderr,
      status: error.status,
      message: error.message,
    });
    throw new Error(`tctl command failed: ${error.message}`);
  }
}

/**
 * Create a join token for a new Teleport node agent.
 * Returns the raw token string.
 */
export function createJoinToken(vmName: string, ttl: string = '30m'): string {
  logger.info(`Creating Teleport join token for VM "${vmName}" with TTL ${ttl}`);

  const output = runTctl(`tokens add --type=node --ttl=${ttl} --format=text`);

  // tctl tokens add outputs the token on stdout when --format=text is used.
  // The token is typically the last non-empty line or can be extracted from output.
  const lines = output.split('\n').filter((l) => l.trim().length > 0);

  // When using --format=text, the token is the entire output (a single token string).
  // If tctl outputs additional info, extract the token line (hex/base64 string).
  const tokenLine = lines.find((l) => /^[a-f0-9]{32,}$/.test(l.trim())) || lines[lines.length - 1];

  if (!tokenLine) {
    throw new Error('Failed to extract join token from tctl output');
  }

  const token = tokenLine.trim();
  logger.info(`Join token created for VM "${vmName}": ${token.substring(0, 8)}...`);
  return token;
}

/**
 * Remove a node from the Teleport cluster by name.
 */
export function removeNode(nodeName: string): void {
  logger.info(`Removing Teleport node: ${nodeName}`);
  runTctl(`rm node/${nodeName}`);
  logger.info(`Teleport node removed: ${nodeName}`);
}

/**
 * List all nodes registered in the Teleport cluster.
 */
export function listNodes(): TeleportNode[] {
  logger.info('Listing Teleport nodes');

  const output = runTctl('nodes ls --format=json');

  if (!output || output === '[]' || output === 'null') {
    return [];
  }

  try {
    const raw = JSON.parse(output);

    // tctl nodes ls --format=json returns an array of node objects.
    // Normalize to our TeleportNode interface.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nodes: TeleportNode[] = (Array.isArray(raw) ? raw : []).map((n: any) => ({
      id: String(n.id || n.metadata?.name || ''),
      hostname: String(n.hostname || n.spec?.hostname || ''),
      addr: String(n.addr || n.spec?.addr || ''),
      labels: (n.labels || n.metadata?.labels || {}) as Record<string, string>,
      tunnel: Boolean(n.tunnel),
    }));

    logger.info(`Found ${nodes.length} Teleport nodes`);
    return nodes;
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to parse tctl nodes output: ${error.message}`);
    throw new Error(`Failed to parse Teleport nodes: ${error.message}`);
  }
}

/**
 * Find a specific Teleport node by hostname or vm-name label.
 */
export function getNodeByName(name: string): TeleportNode | undefined {
  const nodes = listNodes();

  // Match by hostname first, then by vm-name label
  return (
    nodes.find((n) => n.hostname === name) ||
    nodes.find((n) => n.labels['vm-name'] === name) ||
    nodes.find((n) => n.hostname.startsWith(name))
  );
}

/**
 * Build the Teleport web console URL for a given node.
 * Returns the full URL to the web-based SSH terminal.
 */
export function getTeleportWebURL(nodeName: string): string | null {
  const node = getNodeByName(nodeName);
  if (!node) {
    logger.warn(`No Teleport node found for name: ${nodeName}`);
    return null;
  }

  // URL format: https://<proxy>/web/cluster/<cluster>/console/node/<node-id>/<login>
  const url = `${TELEPORT_PROXY_URL}/web/cluster/${TELEPORT_CLUSTER}/console/node/${node.id}/${TELEPORT_SSH_USER}`;
  logger.info(`Teleport web URL for "${nodeName}": ${url}`);
  return url;
}
