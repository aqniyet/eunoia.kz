# eunoia.kz webmail API — runs next to Caddy, see deploy/docker-compose.yml.
# Stays root inside the container: it must append to the mailserver's
# root-owned postfix-accounts.cf bind mount (registration = mailbox creation).
FROM node:22-alpine

# openssl CLI is used to produce SHA512-CRYPT hashes for postfix-accounts.cf
RUN apk add --no-cache openssl

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "src/index.js"]
