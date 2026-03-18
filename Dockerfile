FROM node:20-bookworm-slim

ENV NODE_ENV=production

WORKDIR /app

# OS packages needed by yt-dlp / media workflows
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install backend deps first for better layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Install yt-dlp + EJS support
RUN pip3 install --no-cache-dir -U "yt-dlp[default]"

# Copy app source
COPY . .

EXPOSE 10000

CMD ["npm", "start"]