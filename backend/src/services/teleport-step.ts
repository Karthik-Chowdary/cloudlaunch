import { LaunchStep } from '../types';

/**
 * Major Teleport version to install on target VMs.
 * Update this when upgrading the Teleport cluster.
 */
const TELEPORT_VERSION = process.env.TELEPORT_AGENT_VERSION || '17';

/**
 * Create a LaunchStep that installs and configures the Teleport agent on a target VM.
 *
 * This step runs last (order 99) and is non-blocking (continueOnError: true)
 * so the VM remains usable even if Teleport agent setup fails.
 *
 * @param joinToken  - Short-lived token for the node to join the cluster
 * @param authServer - The Teleport auth/proxy address (host:port)
 */
export function createTeleportAgentStep(
  joinToken: string,
  authServer: string
): LaunchStep {
  const script = `#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=a

echo "=== Installing Teleport agent ==="

# -----------------------------------------------
# 1. Install Teleport via official apt repository
# -----------------------------------------------
echo "Adding Teleport apt repository..."

# Import Teleport GPG key
sudo mkdir -p /usr/share/keyrings
curl -fsSL https://apt.releases.teleport.dev/gpg \\
  | sudo tee /usr/share/keyrings/teleport-archive-keyring.asc >/dev/null

source /etc/os-release

echo "deb [signed-by=/usr/share/keyrings/teleport-archive-keyring.asc] \\
https://apt.releases.teleport.dev/\${ID?} \${VERSION_CODENAME?} stable/v${TELEPORT_VERSION}" \\
  | sudo tee /etc/apt/sources.list.d/teleport.list >/dev/null

sudo apt-get update -qq
sudo DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a apt-get install -y -qq teleport

echo "Teleport version: $(teleport version)"

# -----------------------------------------------
# 2. Write Teleport agent configuration
# -----------------------------------------------
VM_HOSTNAME=$(hostname)
echo "Configuring Teleport agent for host: \${VM_HOSTNAME}"

sudo tee /etc/teleport.yaml >/dev/null <<TELEPORT_EOF
version: v3
teleport:
  nodename: \${VM_HOSTNAME}
  data_dir: /var/lib/teleport
  join_params:
    token_name: "${joinToken}"
    method: token
  proxy_server: "${authServer}"
  log:
    output: stderr
    severity: INFO

auth_service:
  enabled: false

proxy_service:
  enabled: false

ssh_service:
  enabled: true
  labels:
    cloudlaunch: "true"
    vm-name: "\${VM_HOSTNAME}"
  commands:
    - name: uptime
      command: ["/usr/bin/uptime", "-p"]
      period: 60s
TELEPORT_EOF

echo "Teleport config written to /etc/teleport.yaml"

# -----------------------------------------------
# 3. Enable and start Teleport systemd service
# -----------------------------------------------

# Override systemd to use --insecure flag (self-signed proxy cert)
sudo mkdir -p /etc/systemd/system/teleport.service.d
sudo tee /etc/systemd/system/teleport.service.d/insecure.conf > /dev/null <<'SVCOVERRIDE'
[Service]
ExecStart=
ExecStart=/usr/local/bin/teleport start --config /etc/teleport.yaml --pid-file=/run/teleport.pid --insecure
SVCOVERRIDE

sudo systemctl daemon-reload
sudo systemctl enable teleport
sudo systemctl start teleport

echo "Waiting for Teleport agent to initialize..."
sleep 5

# -----------------------------------------------
# 4. Verify agent status
# -----------------------------------------------
if teleport status 2>/dev/null; then
  echo "=== Teleport agent is running ==="
else
  echo "WARNING: teleport status check failed, but service may still be starting"
  sudo systemctl status teleport --no-pager || true
  # Don't fail the step — agent may need more time to join
fi

echo "=== Teleport agent setup complete ==="
`;

  return {
    id: 'teleport-agent',
    name: 'Install Teleport agent',
    description: 'Install Teleport agent for web-based SSH access',
    script,
    timeout: 300,
    continueOnError: true,
    order: 99,
  };
}
