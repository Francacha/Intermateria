#!/bin/sh
# Saca un certificado HTTPS gratis de Let's Encrypt para DOMINIO (del .env),
# activa HTTPS en Nginx y deja programada la renovación automática.
# Se corre una vez en el droplet 1, con el sistema ya levantado:
#   cd deploy/droplet-1 && sh https.sh
set -e
cd "$(dirname "$0")"

DOMINIO=$(grep '^DOMINIO=' .env | cut -d= -f2- | tr -d '"')
if [ -z "$DOMINIO" ]; then
  echo "Falta DOMINIO en el .env (por ejemplo 134.122.120.239.nip.io)" >&2
  exit 1
fi

mkdir -p /etc/letsencrypt /var/www/certbot
CERTBOT="docker run --rm -v /etc/letsencrypt:/etc/letsencrypt -v /var/www/certbot:/var/www/certbot certbot/certbot"

# Nginx tiene que estar sirviendo /.well-known/acme-challenge/ por el puerto 80
docker compose up -d nginx

$CERTBOT certonly --webroot -w /var/www/certbot -d "$DOMINIO"   --agree-tos --register-unsafely-without-email --non-interactive --keep-until-expiring

# Al reiniciar, Nginx encuentra el certificado y activa HTTPS
docker compose restart nginx

# Renovación: todos los días a las 3:30 (certbot solo renueva si faltan menos de 30 días)
cat > /etc/cron.d/certificado-canchas <<CRON
30 3 * * * root $CERTBOT renew --quiet && docker exec canchas-nginx nginx -s reload
CRON
chmod 644 /etc/cron.d/certificado-canchas

echo "Listo: https://$DOMINIO"
