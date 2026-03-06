import { VM } from '../types';
import { config } from '../config';

/**
 * Generate a Cursor/VS Code SSH remote URI
 */
export function getCursorSSHUri(
  host: string,
  user: string = config.ssh.username,
  _keyPath?: string
): string {
  return `vscode://vscode-remote/ssh-remote+${user}@${host}/home/${user}`;
}

/**
 * Generate an SSH command string
 */
export function getSSHCommand(
  host: string,
  user: string = config.ssh.username,
  keyPath: string = '~/.ssh/cloudlaunch_key.pem'
): string {
  return `ssh -i ${keyPath} ${user}@${host}`;
}

/**
 * Generate an SSH config block for ~/.ssh/config
 */
export function getSSHConfig(vm: VM): string {
  const host = vm.publicIp || 'PENDING';
  const name = vm.name.replace(/[^a-zA-Z0-9-_]/g, '-');

  return [
    `Host cloudlaunch-${name}`,
    `  HostName ${host}`,
    `  User ${config.ssh.username}`,
    `  IdentityFile ~/.ssh/cloudlaunch-${vm.id}.pem`,
    `  StrictHostKeyChecking no`,
    `  UserKnownHostsFile /dev/null`,
    '',
  ].join('\n');
}

/**
 * Get full connection info for a VM
 */
export function getConnectionInfo(vm: VM): {
  cursorUri: string;
  sshCommand: string;
  sshConfig: string;
  host: string;
  user: string;
  privateKey: string;
} {
  const host = vm.publicIp || '';
  const user = config.ssh.username;
  const keyPath = `~/.ssh/cloudlaunch-${vm.id}.pem`;

  return {
    cursorUri: getCursorSSHUri(host, user, keyPath),
    sshCommand: getSSHCommand(host, user, keyPath),
    sshConfig: getSSHConfig(vm),
    host,
    user,
    privateKey: vm.privateKey,
  };
}
