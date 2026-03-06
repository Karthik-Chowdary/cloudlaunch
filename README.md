# CloudLaunch 🚀

> Like Brev, but self-hosted. Launch VMs on AWS with configurable setup steps.

## What is it?

CloudLaunch is a microservice that lets you launch VMs on AWS with pre-configured "Launchable" templates. Each template defines an ordered set of setup steps (shell scripts) that run automatically after the VM boots.

**Think of it as:** "one-click dev environments" powered by your own AWS account.

## Features

- 🎯 **Launchable Templates** — Pre-built VM recipes (K8s platform, dev workstation, GPU ML, or custom)
- 🔧 **Step Editor** — Add, remove, reorder, and edit setup steps with a Monaco code editor
- 🚀 **One-Click Launch** — Pick template → configure → launch → watch progress in real-time
- 📡 **Live Progress** — WebSocket streaming of step execution output
- 💻 **Cursor Integration** — One-click "Open in Cursor" button for SSH remote development
- 🎨 **Beautiful UI** — Dark theme, glass-morphism, smooth animations

## Quick Start

### Prerequisites
- Node.js 22+
- Docker (for containerized deployment)
- AWS account with EC2 permissions

### Development

```bash
# Backend
cd backend
cp .env.example .env  # Edit with your AWS credentials
npm install
npm run dev           # Runs on :3002

# Frontend
cd frontend
npm install
npm run dev           # Runs on :5173 (proxies to :3002)
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AWS_ACCESS_KEY_ID` | Yes | — | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Yes | — | AWS secret key |
| `AWS_REGION` | No | `us-east-1` | Default AWS region |
| `PORT` | No | `3002` | Backend port |
| `NODE_ENV` | No | `development` | Environment |

### Docker

```bash
docker build -t cloudlaunch:latest .
docker run -p 3002:3002 \
  -e AWS_ACCESS_KEY_ID=your-key \
  -e AWS_SECRET_ACCESS_KEY=your-secret \
  cloudlaunch:latest
```

### Deploy to local-k8s-platform

```bash
# From local-k8s-platform directory:
make up-marketplace   # This deploys CloudLaunch as an ArgoCD app
```

## Built-in Templates

| Template | Description | Steps |
|----------|-------------|-------|
| 🏗️ Local K8s Platform | Full k3d cluster with ArgoCD, monitoring, marketplace | 4 steps |
| 💻 Dev Workstation | Node.js, Go, Docker, kubectl, helm | 6 steps |
| 🎮 GPU ML Workstation | NVIDIA drivers, CUDA, PyTorch, Jupyter | 5 steps |
| 📦 Empty | Blank canvas — add your own steps | 0 steps |

## Architecture

```
cloudlaunch/
├── frontend/     # React 18 + MUI 5 + Vite
├── backend/      # Express + TypeScript
│   ├── services/
│   │   ├── aws.ts          # EC2 lifecycle
│   │   ├── provisioner.ts  # SSH step execution
│   │   └── templates.ts    # Template CRUD
│   └── websocket/          # Live progress
├── k8s/          # Kubernetes manifests
└── Dockerfile
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/vms` | List all VMs |
| `GET` | `/api/vms/:id` | VM detail + step progress |
| `POST` | `/api/launch` | Launch new VM |
| `DELETE` | `/api/vms/:id` | Terminate VM |
| `POST` | `/api/vms/:id/connect` | Get SSH/Cursor connection info |
| `GET` | `/api/templates` | List launchable templates |
| `POST` | `/api/templates` | Create template |
| `PUT` | `/api/templates/:id` | Update template |
| `DELETE` | `/api/templates/:id` | Delete template |

## License

MIT
