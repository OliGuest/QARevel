# QARevel - Windows Installation Guide

## Prerequisites

### 1. Install Git

Download and install from: https://git-scm.com/download/win

During installation, select **"Git Bash"** as the default terminal.

### 2. Install Node.js 20+

Download the LTS installer from: https://nodejs.org/

After install, open a terminal and verify:

```powershell
node --version
npm --version
```

### 3. Install Docker Desktop

Download from: https://www.docker.com/products/docker-desktop/

- During installation, enable **WSL 2 backend** (recommended)
- After install, open Docker Desktop and wait until it says "Docker is running"

### 4. Install OpenSSL (for JWT key generation)

Option A - Use Git Bash (already includes OpenSSL):

```bash
# Open Git Bash and run:
openssl version
```

Option B - Install via winget:

```powershell
winget install OpenSSL.Light
```

---

## Installation

### Step 1: Clone the repository

```powershell
git clone https://github.com/YOUR_USERNAME/QARevel.git
cd QARevel
```

### Step 2: Install dependencies

```powershell
npm install
```

### Step 3: Install Playwright browsers

```powershell
npx playwright install chromium
```

### Step 4: Start infrastructure (PostgreSQL, Redis, MinIO)

```powershell
docker compose -f infrastructure/docker/docker-compose.yml up -d postgres redis minio
```

Wait a few seconds, then verify all containers are healthy:

```powershell
docker compose -f infrastructure/docker/docker-compose.yml ps
```

You should see `postgres`, `redis`, and `minio` all with status **healthy**.

### Step 5: Generate JWT keys

**Using Git Bash:**

```bash
bash scripts/generate-keys.sh
```

**Using PowerShell (if OpenSSL is installed):**

```powershell
mkdir -Force keys
openssl genrsa -out keys/private.pem 2048
openssl rsa -in keys/private.pem -pubout -out keys/public.pem
```

### Step 6: Create the `.env` file

Create a file called `.env` in the project root with this content:

```env
# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=qarevel
DATABASE_USER=qarevel
DATABASE_PASSWORD=qarevel

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=qarevel
MINIO_SECRET_KEY=qarevel123
MINIO_BUCKET=qarevel

# JWT (update the path to match your Windows path)
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem
JWT_ACCESS_EXPIRY=1h
JWT_REFRESH_EXPIRY=7d

# API
API_PORT=3000
API_URL=http://localhost:3000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=ws://localhost:3000
```

### Step 7: Seed the database

```powershell
npm run db:seed
```

You should see: `Admin user created: admin@qarevel.local / Admin123!`

### Step 8: Start all services

```powershell
npm run dev
```

This starts the API, web frontend, and runner service together.

---

## Open the app

Go to **http://localhost:3001** in your browser.

### Login credentials

| Field    | Value                |
|----------|----------------------|
| Email    | `admin@qarevel.local` |
| Password | `Admin123!`          |

---

## Ports

| Service    | URL                    |
|------------|------------------------|
| Web UI     | http://localhost:3001   |
| API        | http://localhost:3000   |
| MinIO Console | http://localhost:9001 |
| PostgreSQL | localhost:5432         |
| Redis      | localhost:6379         |

---

## Stopping

Stop the dev servers: press `Ctrl+C` in the terminal.

Stop Docker containers:

```powershell
docker compose -f infrastructure/docker/docker-compose.yml down
```

To also delete all data (database, redis, minio):

```powershell
docker compose -f infrastructure/docker/docker-compose.yml down -v
```

---

## Troubleshooting

### "port already in use"
Another app is using the port. Stop it or change the port in `.env`.

### Docker containers won't start
Make sure Docker Desktop is running. Check with `docker ps`.

### "ECONNREFUSED" errors
The Docker containers aren't ready yet. Wait 10-15 seconds after `docker compose up` and try again.

### npm install fails
Make sure you have Node.js 20+. Delete `node_modules` and `package-lock.json`, then run `npm install` again.
