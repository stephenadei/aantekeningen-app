#!/bin/bash
# Script om MinIO publiek te maken, maar alleen de bronze-education bucket

set -e

echo "🔓 MinIO Publiek Maken (Alleen bronze-education bucket)"
echo "=============================================================="
echo ""

# Check of MinIO client (mc) geïnstalleerd is
if ! command -v mc &> /dev/null; then
    echo "📥 MinIO client (mc) installeren..."
    wget https://dl.min.io/client/mc/release/linux-amd64/mc
    chmod +x mc
    sudo mv mc /usr/local/bin/
    echo "✅ MinIO client geïnstalleerd"
fi

# MinIO configuratie - laad van .env.local als beschikbaar
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [ -f "$PROJECT_DIR/.env.local" ]; then
    source "$PROJECT_DIR/.env.local"
fi

MINIO_ENDPOINT="${MINIO_ENDPOINT:-localhost:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
BUCKET_NAME="bronze-education"

echo "🔧 MinIO Configuratie:"
echo "   Endpoint: $MINIO_ENDPOINT"
echo "   Bucket: $BUCKET_NAME"
echo ""

# Configureer MinIO alias
ALIAS_NAME="local-minio"
echo "🔗 MinIO alias configureren..."
mc alias set $ALIAS_NAME http://$MINIO_ENDPOINT $MINIO_ACCESS_KEY $MINIO_SECRET_KEY 2>/dev/null || \
mc alias set $ALIAS_NAME http://$MINIO_ENDPOINT $MINIO_ACCESS_KEY $MINIO_SECRET_KEY

echo "✅ Alias geconfigureerd"
echo ""

# Check of bucket bestaat
echo "📦 Bucket status checken..."
if mc ls $ALIAS_NAME/$BUCKET_NAME &>/dev/null; then
    echo "✅ Bucket '$BUCKET_NAME' bestaat"
else
    echo "❌ Bucket '$BUCKET_NAME' bestaat niet!"
    echo "   Maak eerst de bucket aan in MinIO"
    exit 1
fi

echo ""
echo "🔓 Bucket policy configureren (publiek leesbaar)..."
echo ""

# Maak een publieke lees-policy voor alleen deze bucket
cat > /tmp/bucket-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": ["*"]
      },
      "Action": [
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::${BUCKET_NAME}/*"
      ]
    }
  ]
}
EOF

# Pas policy toe
mc anonymous set download $ALIAS_NAME/$BUCKET_NAME

echo "✅ Bucket policy geconfigureerd: publiek leesbaar"
echo ""

# Verifieer policy
echo "🔍 Policy verificatie:"
mc anonymous get $ALIAS_NAME/$BUCKET_NAME
echo ""

# Cleanup
rm -f /tmp/bucket-policy.json

echo "✅ Klaar!"
echo ""
echo "📋 Volgende stappen:"
echo "   1. Zorg dat MinIO publiek bereikbaar is (firewall/nginx)"
echo "   2. Update .env.local met publiek endpoint"
echo "   3. Herstart Docker container"
echo ""
echo "⚠️  Let op: Alleen de '$BUCKET_NAME' bucket is nu publiek leesbaar"
echo "   Andere buckets blijven privé"

