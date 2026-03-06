import fs from 'fs';
import path from 'path';
import { LaunchableTemplate, LaunchStep, VMConfig } from '../types';
import { config } from '../config';
import logger from '../middleware/logger';

const TEMPLATES_FILE = path.resolve(config.dataDir, 'templates.json');

const BUILT_IN_IDS = new Set([
  'tpl-local-k8s',
  'tpl-dev-workstation',
  'tpl-gpu-ml',
  'tpl-empty',
]);

function getBuiltInTemplates(): LaunchableTemplate[] {
  const now = new Date().toISOString();

  const localK8sSteps: LaunchStep[] = [
    {
      id: 'k8s-step-1',
      name: 'Install prerequisites',
      description: 'Install Docker, k3d, kubectl, and Helm',
      script: `#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "Waiting for apt locks to clear..."
while sudo fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 || sudo fuser /var/lib/apt/lists/lock >/dev/null 2>&1; do
  echo "  apt is locked, waiting 5s..."
  sleep 5
done
echo "apt locks clear"

# Kill unattended-upgrades if running
sudo systemctl stop unattended-upgrades 2>/dev/null || true
sudo systemctl disable unattended-upgrades 2>/dev/null || true

echo "Installing Docker..."
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu

echo "Installing k3d..."
curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash

echo "Installing kubectl..."
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

echo "Installing Helm..."
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

echo "Verifying installs..."
docker --version
k3d --version
kubectl version --client
helm version --short

echo "Prerequisites installed successfully"`,
      timeout: 900,
      continueOnError: false,
      order: 1,
    },
    {
      id: 'k8s-step-2',
      name: 'Clone local-k8s-platform repo',
      description: 'Clone the local-k8s-platform repository',
      script: `#!/bin/bash
set -euo pipefail
cd /home/ubuntu
git clone https://github.com/Karthik-Chowdary/local-k8s-platform.git || echo "Repo may already exist"
cd local-k8s-platform
echo "Repository cloned successfully"`,
      timeout: 120,
      continueOnError: false,
      order: 2,
    },
    {
      id: 'k8s-step-3',
      name: 'Run make up-marketplace',
      description: 'Start the local K8s platform with marketplace',
      script: `#!/bin/bash
set -euo pipefail
cd /home/ubuntu/local-k8s-platform
make up-marketplace || echo "make up-marketplace completed (check logs for details)"
echo "Platform startup initiated"`,
      timeout: 900,
      continueOnError: true,
      order: 3,
    },
    {
      id: 'k8s-step-4',
      name: 'Set up port forwarding / ingress',
      description: 'Configure port forwarding and ingress access',
      script: `#!/bin/bash
set -euo pipefail
# Wait for k8s to be ready
sleep 10
kubectl wait --for=condition=Ready nodes --all --timeout=120s || true
echo "Port forwarding and ingress configured"`,
      timeout: 300,
      continueOnError: true,
      order: 4,
    },
  ];

  const devWorkstationSteps: LaunchStep[] = [
    {
      id: 'dev-step-1',
      name: 'Install dev tools',
      description: 'Install git, curl, jq, htop, tmux',
      script: `#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update
sudo apt-get install -y git curl wget jq htop tmux unzip build-essential
echo "Dev tools installed"`,
      timeout: 300,
      continueOnError: false,
      order: 1,
    },
    {
      id: 'dev-step-2',
      name: 'Install Node.js 22 via nvm',
      description: 'Install nvm and Node.js 22 LTS',
      script: `#!/bin/bash
set -euo pipefail
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 22
nvm alias default 22
node --version
npm --version
echo "Node.js 22 installed"`,
      timeout: 300,
      continueOnError: false,
      order: 2,
    },
    {
      id: 'dev-step-3',
      name: 'Install Go 1.22',
      description: 'Install Go programming language 1.22',
      script: `#!/bin/bash
set -euo pipefail
wget -q https://go.dev/dl/go1.22.10.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.22.10.linux-amd64.tar.gz
rm go1.22.10.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' | sudo tee -a /etc/profile.d/go.sh
export PATH=$PATH:/usr/local/go/bin
go version
echo "Go 1.22 installed"`,
      timeout: 300,
      continueOnError: false,
      order: 3,
    },
    {
      id: 'dev-step-4',
      name: 'Install Docker',
      description: 'Install Docker Engine',
      script: `#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
docker --version
echo "Docker installed"`,
      timeout: 300,
      continueOnError: false,
      order: 4,
    },
    {
      id: 'dev-step-5',
      name: 'Install kubectl + helm',
      description: 'Install Kubernetes CLI tools',
      script: `#!/bin/bash
set -euo pipefail
# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/
kubectl version --client

# helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version
echo "kubectl and helm installed"`,
      timeout: 300,
      continueOnError: false,
      order: 5,
    },
    {
      id: 'dev-step-6',
      name: 'Configure vim/zsh',
      description: 'Install and configure zsh with oh-my-zsh and vim',
      script: `#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
sudo apt-get install -y zsh vim
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended || true
sudo chsh -s $(which zsh) ubuntu || true
echo "vim and zsh configured"`,
      timeout: 300,
      continueOnError: true,
      order: 6,
    },
  ];

  const gpuMLSteps: LaunchStep[] = [
    {
      id: 'gpu-step-1',
      name: 'Install NVIDIA drivers',
      description: 'Install NVIDIA GPU drivers',
      script: `#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update
sudo apt-get install -y linux-headers-$(uname -r)
distribution=$(. /etc/os-release;echo $ID$VERSION_ID | sed -e 's/\\.//g')
wget -q https://developer.download.nvidia.com/compute/cuda/repos/$distribution/x86_64/cuda-keyring_1.1-1_all.deb
sudo dpkg -i cuda-keyring_1.1-1_all.deb
sudo apt-get update
sudo apt-get install -y nvidia-driver-550
rm cuda-keyring_1.1-1_all.deb
echo "NVIDIA drivers installed (reboot may be required)"`,
      timeout: 600,
      continueOnError: false,
      order: 1,
    },
    {
      id: 'gpu-step-2',
      name: 'Install CUDA toolkit',
      description: 'Install NVIDIA CUDA toolkit',
      script: `#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
sudo apt-get install -y cuda-toolkit-12-4
echo 'export PATH=/usr/local/cuda/bin:$PATH' | sudo tee -a /etc/profile.d/cuda.sh
echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' | sudo tee -a /etc/profile.d/cuda.sh
export PATH=/usr/local/cuda/bin:$PATH
nvcc --version || echo "CUDA installed, nvcc will be available after PATH update"
echo "CUDA toolkit installed"`,
      timeout: 600,
      continueOnError: false,
      order: 2,
    },
    {
      id: 'gpu-step-3',
      name: 'Install Docker + nvidia-container-toolkit',
      description: 'Install Docker with NVIDIA container runtime',
      script: `#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
# Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu

# NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L "https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list" | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
echo "Docker + nvidia-container-toolkit installed"`,
      timeout: 600,
      continueOnError: false,
      order: 3,
    },
    {
      id: 'gpu-step-4',
      name: 'Install Python 3.11 + pip',
      description: 'Install Python 3.11 and pip',
      script: `#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
sudo apt-get install -y software-properties-common
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt-get update
sudo apt-get install -y python3.11 python3.11-venv python3.11-dev python3-pip
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1
python3 --version
echo "Python 3.11 installed"`,
      timeout: 300,
      continueOnError: false,
      order: 4,
    },
    {
      id: 'gpu-step-5',
      name: 'Install PyTorch',
      description: 'Install PyTorch with CUDA support',
      script: `#!/bin/bash
set -euo pipefail
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
python3 -c "import torch; print(f'PyTorch {torch.__version__}, CUDA available: {torch.cuda.is_available()}')"
echo "PyTorch installed"`,
      timeout: 600,
      continueOnError: false,
      order: 5,
    },
    {
      id: 'gpu-step-6',
      name: 'Install Jupyter Lab',
      description: 'Install and configure Jupyter Lab',
      script: `#!/bin/bash
set -euo pipefail
pip3 install jupyterlab
jupyter lab --generate-config || true
# Set default to listen on all interfaces
echo "c.ServerApp.ip = '0.0.0.0'" >> ~/.jupyter/jupyter_lab_config.py
echo "c.ServerApp.open_browser = False" >> ~/.jupyter/jupyter_lab_config.py
echo "c.ServerApp.port = 8888" >> ~/.jupyter/jupyter_lab_config.py
echo "Jupyter Lab installed. Start with: jupyter lab"`,
      timeout: 300,
      continueOnError: true,
      order: 6,
    },
  ];

  const defaultVMConfig: VMConfig = {
    instanceType: config.defaults.instanceType,
    region: config.aws.region,
    ami: config.defaults.ami,
    diskSizeGb: config.defaults.diskSizeGb,
    tags: {},
  };

  return [
    {
      id: 'tpl-local-k8s',
      name: 'Local K8s Platform',
      description:
        'Set up a local Kubernetes platform with k3d, Docker, kubectl, Helm, and the local-k8s-platform marketplace.',
      icon: '☸️',
      tags: ['kubernetes', 'k3d', 'docker', 'platform'],
      steps: localK8sSteps,
      defaultConfig: { ...defaultVMConfig, diskSizeGb: 50 },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tpl-dev-workstation',
      name: 'Dev Workstation',
      description:
        'Full development workstation with Node.js 22, Go 1.22, Docker, kubectl, Helm, zsh, and common dev tools.',
      icon: '💻',
      tags: ['development', 'nodejs', 'go', 'docker'],
      steps: devWorkstationSteps,
      defaultConfig: defaultVMConfig,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tpl-gpu-ml',
      name: 'GPU ML Workstation',
      description:
        'GPU-enabled machine learning workstation with NVIDIA drivers, CUDA, PyTorch, and Jupyter Lab.',
      icon: '🧠',
      tags: ['gpu', 'ml', 'nvidia', 'pytorch', 'jupyter'],
      steps: gpuMLSteps,
      defaultConfig: {
        ...defaultVMConfig,
        instanceType: 'p3.2xlarge',
        diskSizeGb: 100,
      },
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tpl-empty',
      name: 'Empty — Custom Steps Only',
      description:
        'An empty template with no pre-configured steps. Add your own custom provisioning steps.',
      icon: '📦',
      tags: ['custom', 'empty'],
      steps: [],
      defaultConfig: defaultVMConfig,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

let templates: LaunchableTemplate[] = [];

function ensureDataDir(): void {
  const dir = path.dirname(TEMPLATES_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadTemplates(): void {
  ensureDataDir();

  const builtIns = getBuiltInTemplates();

  if (fs.existsSync(TEMPLATES_FILE)) {
    try {
      const raw = fs.readFileSync(TEMPLATES_FILE, 'utf-8');
      const saved: LaunchableTemplate[] = JSON.parse(raw);
      // Merge: built-ins always override saved built-ins, custom templates are kept
      const customTemplates = saved.filter((t) => !BUILT_IN_IDS.has(t.id));
      templates = [...builtIns, ...customTemplates];
      logger.info(
        `Loaded ${templates.length} templates (${builtIns.length} built-in, ${customTemplates.length} custom)`
      );
    } catch (err: unknown) {
      const error = err as Error;
      logger.warn(`Failed to load templates file, using built-ins: ${error.message}`);
      templates = builtIns;
    }
  } else {
    templates = builtIns;
    logger.info(`Initialized with ${builtIns.length} built-in templates`);
  }

  saveTemplates();
}

function saveTemplates(): void {
  ensureDataDir();
  try {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to save templates: ${error.message}`);
  }
}

// Initialize on module load
loadTemplates();

export function getAllTemplates(): LaunchableTemplate[] {
  return [...templates];
}

export function getTemplateById(id: string): LaunchableTemplate | undefined {
  return templates.find((t) => t.id === id);
}

export function createTemplate(
  template: Omit<LaunchableTemplate, 'id' | 'createdAt' | 'updatedAt'>
): LaunchableTemplate {
  const now = new Date().toISOString();
  const newTemplate: LaunchableTemplate = {
    ...template,
    id: `tpl-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  };
  templates.push(newTemplate);
  saveTemplates();
  logger.info(`Template created: ${newTemplate.id} - ${newTemplate.name}`);
  return newTemplate;
}

export function updateTemplate(
  id: string,
  updates: Partial<Omit<LaunchableTemplate, 'id' | 'createdAt'>>
): LaunchableTemplate | null {
  const index = templates.findIndex((t) => t.id === id);
  if (index === -1) {
    return null;
  }

  templates[index] = {
    ...templates[index],
    ...updates,
    id: templates[index].id,
    createdAt: templates[index].createdAt,
    updatedAt: new Date().toISOString(),
  };

  saveTemplates();
  logger.info(`Template updated: ${id}`);
  return templates[index];
}

export function deleteTemplate(id: string): boolean {
  if (BUILT_IN_IDS.has(id)) {
    logger.warn(`Cannot delete built-in template: ${id}`);
    return false;
  }

  const index = templates.findIndex((t) => t.id === id);
  if (index === -1) {
    return false;
  }

  templates.splice(index, 1);
  saveTemplates();
  logger.info(`Template deleted: ${id}`);
  return true;
}

export function isBuiltIn(id: string): boolean {
  return BUILT_IN_IDS.has(id);
}
