# SolDegen - Production Deployment Guide

## 🚀 Quick Start (Development)

Sekarang cukup jalankan **1 command**:

```bash
node server.js
```

Python physics backend akan otomatis start! ✅

## 📦 Production Deployment

### Option 1: VPS / Cloud Server (Recommended)

#### 1. Install Dependencies
```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3.8+
sudo apt-get install -y python3 python3-pip

# Install pnpm
npm install -g pnpm
```

#### 2. Clone & Setup
```bash
git clone <your-repo>
cd SolDegen

# Install Node dependencies
pnpm install

# Install Python dependencies
cd python-backend
pip3 install -r requirements.txt
cd ..
```

#### 3. Environment Variables
Create `.env.local`:
```bash
NEXT_PUBLIC_API_BASE=https://yourdomain.com
NEXT_PUBLIC_PHYSICS_SERVER_URL=https://yourdomain.com:8000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

#### 4. Build & Start
```bash
# Build Next.js
pnpm build

# Start production server (runs both Node + Python)
NODE_ENV=production node server.js
```

#### 5. Process Manager (PM2)
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server.js --name "soldegen"

# Auto-restart on reboot
pm2 startup
pm2 save
```

### Option 2: Vercel + Separate Python Server

#### Frontend (Vercel)
```bash
# Deploy to Vercel
vercel --prod

# Set environment variables in Vercel dashboard
NEXT_PUBLIC_API_BASE=https://your-api-server.com
NEXT_PUBLIC_PHYSICS_SERVER_URL=https://your-physics-server.com
```

#### Python Backend (Separate VPS)
```bash
# On physics server
cd python-backend
pip3 install -r requirements.txt

# Run with systemd
sudo nano /etc/systemd/system/plinko-physics.service
```

Service file:
```ini
[Unit]
Description=Plinko Physics Backend
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/python-backend
ExecStart=/usr/bin/python3 main.py
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
# Enable service
sudo systemctl enable plinko-physics
sudo systemctl start plinko-physics
sudo systemctl status plinko-physics
```

### Option 3: Docker

Create `Dockerfile`:
```dockerfile
FROM node:20-alpine

# Install Python
RUN apk add --no-cache python3 py3-pip

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY python-backend/requirements.txt ./python-backend/

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install
RUN cd python-backend && pip3 install -r requirements.txt

# Copy app
COPY . .

# Build Next.js
RUN pnpm build

# Expose ports
EXPOSE 3000 8000

# Start server (auto-starts Python)
CMD ["node", "server.js"]
```

Build & Run:
```bash
docker build -t soldegen .
docker run -p 3000:3000 -p 8000:8000 soldegen
```

## 🔧 Configuration

### Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Python Physics WebSocket
    location /socket.io/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

### SSL with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## 📊 Monitoring

### Check Logs
```bash
# Node server
pm2 logs soldegen

# Python backend (if separate systemd)
sudo journalctl -u plinko-physics -f

# Docker
docker logs -f container_id
```

### Health Checks
```bash
# Node server
curl http://localhost:3000/api/health

# Python backend
curl http://localhost:8000/health
```

## 🔒 Security Checklist

- [ ] Change all default secrets in `.env`
- [ ] Enable CORS only for your domain
- [ ] Use HTTPS (SSL certificates)
- [ ] Enable rate limiting
- [ ] Set up firewall rules
- [ ] Regular security updates
- [ ] Database backups (if using Supabase)

## 🐛 Troubleshooting

### Python backend not starting
```bash
# Check if Python is installed
python3 --version

# Check dependencies
cd python-backend
pip3 install -r requirements.txt

# Test manually
python3 main.py
```

### Port conflicts
```bash
# Check what's using ports
sudo lsof -i :3000
sudo lsof -i :8000

# Kill processes
kill -9 PID
```

### WebSocket connection issues
- Check firewall allows ports 3000 & 8000
- Verify CORS settings in both servers
- Check nginx WebSocket proxy settings

## 📈 Performance Tips

1. **Enable production mode**: Set `NODE_ENV=production`
2. **Use CDN**: For static assets
3. **Database indexes**: If using Supabase
4. **Caching**: Redis for session/state
5. **Load balancing**: PM2 cluster mode
   ```bash
   pm2 start server.js -i max --name "soldegen"
   ```

## 🎯 Next Steps

1. Set up monitoring (DataDog, New Relic, etc)
2. Configure automatic backups
3. Set up CI/CD pipeline
4. Add rate limiting for API endpoints
5. Implement proper logging (Winston, Pino)
