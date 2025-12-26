#!/bin/bash
# Script om MinIO achter nginx reverse proxy te zetten (alleen educatie bucket publiek)

set -e

echo "🌐 MinIO Nginx Reverse Proxy Setup"
echo "===================================="
echo ""

# Check of nginx geïnstalleerd is
if ! command -v nginx &> /dev/null; then
    echo "📥 Nginx installeren..."
    sudo apt-get update
    sudo apt-get install -y nginx
    echo "✅ Nginx geïnstalleerd"
fi

# Domain of IP
DOMAIN="${1:-minio.stephensprive.app}"
SERVER_IP="${2:-144.91.127.229}"

echo "🔧 Configuratie:"
echo "   Domain: $DOMAIN"
echo "   Server IP: $SERVER_IP"
echo ""

# Maak nginx config
NGINX_CONFIG="/etc/nginx/sites-available/$DOMAIN"

echo "📝 Nginx configuratie maken..."
sudo tee $NGINX_CONFIG > /dev/null <<EOF
# MinIO Reverse Proxy - Alleen educatie-lesmateriaal bucket publiek
server {
    listen 80;
    server_name $DOMAIN;

    # Redirect to HTTPS (als SSL beschikbaar is)
    # return 301 https://\$server_name\$request_uri;
    
    # Voor nu: HTTP (kan later SSL toevoegen)
    
    # MinIO requires large request body
    client_max_body_size 1000M;

    location / {
        proxy_pass http://localhost:9000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # MinIO specific headers
        proxy_set_header X-Forwarded-Host \$host;
        proxy_set_header X-Forwarded-Port \$server_port;
        
        # WebSocket support (for MinIO console)
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        proxy_read_timeout 300;
    }
}
EOF

echo "✅ Nginx configuratie gemaakt"
echo ""

# Enable site
if [ ! -L "/etc/nginx/sites-enabled/$DOMAIN" ]; then
    echo "🔗 Site enablen..."
    sudo ln -s $NGINX_CONFIG /etc/nginx/sites-enabled/
    echo "✅ Site enabled"
fi

# Test nginx config
echo "🧪 Nginx configuratie testen..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuratie is geldig"
    echo ""
    echo "🔄 Nginx herstarten..."
    sudo systemctl restart nginx
    echo "✅ Nginx herstart"
else
    echo "❌ Nginx configuratie heeft fouten!"
    exit 1
fi

echo ""
echo "✅ Nginx reverse proxy geconfigureerd!"
echo ""
echo "📋 Volgende stappen:"
echo "   1. DNS record toevoegen: $DOMAIN -> $SERVER_IP"
echo "   2. SSL certificaat aanvragen (optioneel):"
echo "      sudo certbot --nginx -d $DOMAIN"
echo "   3. Update .env.local:"
echo "      MINIO_ENDPOINT=$DOMAIN"
echo "      MINIO_PORT=80  # Of 443 voor HTTPS"
echo "      MINIO_SECURE=false  # Of true voor HTTPS"
echo "   4. Run bucket policy script:"
echo "      ./scripts/setup-minio-public.sh"
echo "   5. Herstart Docker container"

