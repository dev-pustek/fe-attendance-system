# Deployment Guide for Frontend Visio (IP/Port Version)

This guide assumes you are deploying to an Ubuntu VPS at `/home/deploy/apps/fe-visio` and will access it via your Public IP and a specific port (e.g., `4000`).

## 1. Server Prerequisites

Ensure your Ubuntu VPS has **Node.js** and **Nginx** installed.

### Install Node.js (v18 or later)
```bash
# Update packages
sudo apt update
sudo apt install -y curl

# Install Node.js standard version
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify install
node -v
npm -v
```

### Install Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

## 2. Deploy Code

We will assume you are using the user `deploy`.

```bash
# Create directory
mkdir -p /home/deploy/apps/fe-visio

# Navigate to directory
cd /home/deploy/apps/fe-visio

# Option A: Clone from Git (Recommended)
# git clone <your-repo-url> .

# Option B: Copy files manually
# (Copy your project files here)
```

## 3. Configure Environment (Optional)

If you need to change the API URL (defaults to `http://103.6.207.34:8080/api/v1`), create a `.env` file:

```bash
nano .env
```

Add:
```
VITE_API_BASE_URL=http://your-new-api-ip:port/api/v1
```

## 4. Build the Project

Once the code is on the server:

```bash
cd /home/deploy/apps/fe-visio

# Install dependencies
npm install

# Build the project
npm run build
```

This will create a `dist` folder containing the static files.

## 5. Configure Nginx

Create a new Nginx configuration block. We will use port **4000** as requested.

```bash
sudo nano /etc/nginx/sites-available/fe-visio-ip
```

Paste the following configuration:

```nginx
server {
    # Listen on the specific port
    listen 4000;
    
    # Catch-all server name for IP access
    server_name _;

    root /home/deploy/apps/fe-visio/dist;
    index index.html;

    access_log /var/log/nginx/visio_access.log;
    error_log /var/log/nginx/visio_error.log;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Optional: Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, no-transform";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/fe-visio-ip /etc/nginx/sites-enabled/
```

**Important**: Make sure your firewall allows traffic on this port.
```bash
sudo ufw allow 4000/tcp
```

Test and reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 6. Accessing the Application

You can now access your application at:
`http://<YOUR_VPS_PUBLIC_IP>:4000`
