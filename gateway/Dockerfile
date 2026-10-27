# Internal gateway for the Coolify deployment (see docker-compose.coolify.yml).
# The Caddyfile is baked into the image: Coolify does not keep the repo checkout
# on the host, so bind-mounting it from the repo is not possible.
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
