

# Integrating Holy Unblocker as SolarNova's Proxy Backend

## What We Will Build

Right now, SolarNova's proxy tab tries to fetch websites using a backend function -- which fails on most modern sites. We are replacing that with **Holy Unblocker**, a real proxy that can load virtually any website (YouTube, Discord, Google, etc.).

SolarNova will become a **UI shell** (the tab bar, URL bar, navigation buttons) wrapped around Holy Unblocker running inside an invisible iframe.

---

## Code Changes (What I Will Do)

### 1. Create `src/lib/proxyConfig.ts`
A simple config file with one setting: the URL where your Holy Unblocker instance lives. Default will be same domain at `/holy/`. You only change this one file if your setup differs.

### 2. Rewrite `src/components/proxy/ProxyContent.tsx`
- Remove all the edge-function fetching logic
- Replace with a single `<iframe>` that loads Holy Unblocker
- When you type a URL in the SolarNova URL bar, it tells the iframe to navigate there

### 3. Simplify `src/contexts/ProxyContext.tsx`
- Remove `content`, `isLoading`, `error` fields from tab state (Holy Unblocker handles all rendering)
- Keep tabs, history, and URL tracking for the SolarNova overlay UI
- Navigation now communicates with the iframe instead of calling backend functions

### 4. Update `src/components/proxy/ProxyBrowser.tsx`
- Wire the URL bar to send navigation commands to the Holy Unblocker iframe
- Listen for URL changes from the iframe to keep the address bar in sync

### 5. Update `src/components/proxy/ProxyStartPage.tsx`
- Remove "verified to work" disclaimers (everything works now)
- Update description text to reflect full browsing capability

### 6. Update `src/components/proxy/ProxySettings.tsx`
- Add a field to configure the Holy Unblocker backend URL

---

## How to Deploy on AWS (Step-by-Step Beginner Guide)

### What You Need
- An **AWS account** (free to create at aws.amazon.com)
- A basic understanding of clicking through web interfaces
- About 30-60 minutes

### Step 1: Create an AWS Server

1. Go to **AWS Console** -> search for **EC2** -> click **Launch Instance**
2. Give it a name like `solarnova-server`
3. Choose **Ubuntu 24.04** as the operating system (it is free tier eligible)
4. For instance type, pick **t2.micro** (free tier) or **t2.small** (~$15/month) for better performance
5. Under **Key pair**, click **Create new key pair**, name it `solarnova-key`, download the `.pem` file (you will need this to connect)
6. Under **Network settings**, check these boxes:
   - Allow SSH traffic (so you can connect)
   - Allow HTTPS traffic (so your site works)
   - Allow HTTP traffic
7. Set storage to **20 GB**
8. Click **Launch instance**
9. Wait 1-2 minutes, then click on your instance to see its **Public IP address** (something like `3.15.42.100`)

### Step 2: Connect to Your Server

**On Windows:** Download and install [PuTTY](https://putty.org) or use Windows Terminal/PowerShell:
```
ssh -i solarnova-key.pem ubuntu@YOUR_IP_ADDRESS
```

**On Mac/Linux:** Open Terminal and run:
```
chmod 400 solarnova-key.pem
ssh -i solarnova-key.pem ubuntu@YOUR_IP_ADDRESS
```

Replace `YOUR_IP_ADDRESS` with the IP from Step 1.

### Step 3: Install Required Software

Copy and paste these commands one at a time into your server terminal:

```bash
# Update the system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Nginx (the web server)
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Install PM2 (keeps your apps running)
sudo npm install -g pm2
```

### Step 4: Set Up Holy Unblocker

```bash
# Go to home directory
cd ~

# Clone Holy Unblocker
git clone https://github.com/holy-unblocker/website-aio.git holy-unblocker
cd holy-unblocker

# Install dependencies
npm install

# Build it
npm run build

# Start it with PM2 (keeps it running even if you disconnect)
pm2 start npm --name "holy-unblocker" -- start
pm2 save
pm2 startup
```

Holy Unblocker will now be running on port **8080** (or whatever port it defaults to -- check its README).

### Step 5: Build SolarNova

On your **local computer** (not the server), after I make the code changes:

1. Open a terminal in your SolarNova project folder
2. Run:
```bash
npm run build
```
3. This creates a `dist/` folder with your built website

### Step 6: Upload SolarNova to the Server

From your local computer:
```bash
# Create directory on server
ssh -i solarnova-key.pem ubuntu@YOUR_IP_ADDRESS "sudo mkdir -p /var/www/solarnova"

# Upload the built files
scp -i solarnova-key.pem -r dist/* ubuntu@YOUR_IP_ADDRESS:/tmp/solarnova/
ssh -i solarnova-key.pem ubuntu@YOUR_IP_ADDRESS "sudo cp -r /tmp/solarnova/* /var/www/solarnova/"
```

### Step 7: Configure Nginx

On your server, create the config file:
```bash
sudo nano /etc/nginx/sites-available/solarnova
```

Paste this entire block (use Ctrl+Shift+V to paste in terminal):
```nginx
server {
    listen 80;
    server_name YOUR_IP_ADDRESS;

    # SolarNova frontend
    root /var/www/solarnova;
    index index.html;

    # All normal pages go to SolarNova's index.html (React routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Holy Unblocker frontend
    location /holy/ {
        proxy_pass http://127.0.0.1:8080/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Bare server (Holy Unblocker's backend)
    location /bare/ {
        proxy_pass http://127.0.0.1:8080/bare/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # WISP protocol (alternative backend)
    location /wisp/ {
        proxy_pass http://127.0.0.1:8080/wisp/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

Press **Ctrl+X**, then **Y**, then **Enter** to save.

Now activate it:
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/solarnova /etc/nginx/sites-enabled/
# Remove the default site
sudo rm /etc/nginx/sites-enabled/default
# Test the config
sudo nginx -t
# Restart Nginx
sudo systemctl restart nginx
```

### Step 8: Add HTTPS (Free SSL Certificate)

This is required because service workers (which Holy Unblocker needs) only work on HTTPS.

If you have a **domain name** (like solarnova.com):
1. Point your domain's DNS to your server's IP address (in your domain registrar's settings)
2. Then run:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```
Follow the prompts (enter email, agree to terms). Certbot automatically configures HTTPS.

If you do NOT have a domain and just want to use the IP address, you will need a self-signed certificate (works for testing but browsers will show a warning):
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/solarnova.key \
  -out /etc/ssl/certs/solarnova.crt
```
Then update the Nginx config to use these. But I strongly recommend buying a cheap domain ($10/year from Namecheap or similar).

### Step 9: Test It

Open your browser and go to:
- `https://yourdomain.com` -- should show SolarNova
- `https://yourdomain.com/holy/` -- should show Holy Unblocker's interface
- Click the Proxy tab in SolarNova and try loading any website

---

## Common Problems and Fixes

| Problem | Fix |
|---------|-----|
| "Connection refused" when visiting your IP | Check that Nginx is running: `sudo systemctl status nginx` |
| Holy Unblocker page is blank | Check it is running: `pm2 status`. Restart with `pm2 restart holy-unblocker` |
| Sites do not load through proxy | Make sure HTTPS is set up (service workers require it) |
| Cannot connect via SSH | Check your EC2 security group allows port 22 |
| "502 Bad Gateway" | Holy Unblocker crashed. Check logs: `pm2 logs holy-unblocker` |

## Updating SolarNova Later

Whenever you make changes in Lovable and want to update your server:
1. Build locally: `npm run build`
2. Upload: `scp -i solarnova-key.pem -r dist/* ubuntu@YOUR_IP_ADDRESS:/tmp/solarnova/ && ssh -i solarnova-key.pem ubuntu@YOUR_IP_ADDRESS "sudo cp -r /tmp/solarnova/* /var/www/solarnova/"`

---

## Monthly Cost Estimate

| Item | Cost |
|------|------|
| AWS EC2 t2.micro (free tier first year) | $0 - $8/month |
| Domain name (optional) | ~$10/year |
| SSL certificate (Let's Encrypt) | Free |
| **Total** | **$0 - $9/month** |

---

## Technical Summary of File Changes

| File | Action | What Changes |
|------|--------|-------------|
| `src/lib/proxyConfig.ts` | Create | Config file with Holy Unblocker base URL |
| `src/components/proxy/ProxyContent.tsx` | Rewrite | Remove edge function calls, add iframe to Holy Unblocker |
| `src/contexts/ProxyContext.tsx` | Simplify | Remove content/loading/error state, keep tab/URL management |
| `src/components/proxy/ProxyBrowser.tsx` | Update | Wire URL bar to iframe via postMessage |
| `src/components/proxy/ProxyStartPage.tsx` | Update | Remove limitation warnings, update copy |
| `src/components/proxy/ProxySettings.tsx` | Update | Add Holy Unblocker URL configuration field |

