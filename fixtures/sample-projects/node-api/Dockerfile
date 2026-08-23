# Fixture only — presence is what project-analyzer checks for (Docker deployment signal).
FROM node:22-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["node", "index.js"]
