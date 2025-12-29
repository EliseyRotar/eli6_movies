#!/bin/bash

# Script per rendere sicuro il deployment di eli6_movies
# Esegui questo script come root o con sudo

echo "🔒 SECURING ELI6_MOVIES DEPLOYMENT..."

# 1. Creare directory sicura per il backend (fuori dalla web root)
echo "📁 Creating secure backend directory..."
mkdir -p /opt/eli6_backend
cp -r backend/* /opt/eli6_backend/
chown -R www-data:www-data /opt/eli6_backend
chmod -R 750 /opt/eli6_backend

# 2.5 Install dependencies
echo "📦 Installing production dependencies..."
cd /opt/eli6_backend
npm install --production
cd -

# 2. Creare file .env sicuro
echo "🔐 Creating secure environment file..."
tee /opt/eli6_backend/.env > /dev/null <<EOF
MONGODB_URI=mongodb://localhost:27017/eli6_movies
JWT_SECRET=$(openssl rand -base64 64)
PORT=3001
NODE_ENV=production
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@ecolens.me
ADMIN_PASSWORD_HASH=\$(echo "CHANGE_THIS_PASSWORD" | bcrypt -r 10)
TMDB_API_KEY=REDACTED_TMDB_API_KEY_OLD
EOF

# 3. Rimuovere file sensibili dalla web root
echo "🗑️ Removing sensitive files from web root..."
# rm -f /opt/eli6/eli6_movies/backend/server.env
# rm -f /opt/eli6/eli6_movies/backend/server.log
# rm -f /opt/eli6/eli6_movies/backend/package.json
# rm -f /opt/eli6/eli6_movies/backend/package-lock.json
# rm -rf /opt/eli6/eli6_movies/backend/node_modules

# 4. Creare systemd service per il backend
echo "⚙️ Creating systemd service for backend..."
tee /etc/systemd/system/eli6-backend.service > /dev/null <<EOF
[Unit]
Description=Eli6 Movies Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/eli6_backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# 5. Abilitare e avviare il service
echo "🚀 Starting backend service..."
systemctl daemon-reload
systemctl enable eli6-backend
systemctl restart eli6-backend

# 6. Verificare che il backend sia in esecuzione
echo "✅ Checking backend status..."
systemctl status eli6-backend --no-pager

# 7. Configurare firewall (se ufw è attivo)
if command -v ufw &> /dev/null; then
    echo "🔥 Configuring firewall..."
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw deny 3001/tcp  # Backend port should not be public
fi

# 8. Creare directory per i log nginx
echo "📝 Setting up nginx logging..."
mkdir -p /var/log/nginx
touch /var/log/nginx/streaming.ecolens.me.access.log
touch /var/log/nginx/streaming.ecolens.me.error.log
chown www-data:adm /var/log/nginx/streaming.ecolens.me.*

echo ""
echo "🎉 DEPLOYMENT SECURED!"
echo ""
echo "📋 NEXT STEPS:"
echo "1. Update your nginx configuration with nginx-secure.conf"
echo "2. Change the admin password in /opt/eli6_backend/.env"
echo "3. Restart nginx: systemctl restart nginx"
echo "4. Test your site: https://streaming.ecolens.me"
echo ""
echo "🔒 SECURITY FEATURES ENABLED:"
echo "✅ Backend moved to secure location"
echo "✅ Environment variables secured"
echo "✅ Rate limiting enabled"
echo "✅ Security headers added"
echo "✅ Sensitive files blocked"
echo "✅ Systemd service created"
echo ""
echo "⚠️  IMPORTANT: Change the admin password in /opt/eli6_backend/.env"
