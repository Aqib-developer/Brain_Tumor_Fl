FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /workspace/backend

COPY package.json package-lock.json ./
# The checked-in lockfile must include nodemailer for OTP email support.
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY . .

USER node
EXPOSE 5000
CMD ["node", "server.js"]
