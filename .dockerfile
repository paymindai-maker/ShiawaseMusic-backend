FROM node:22-bullseye

WORKDIR /app

RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg \
    && pip3 install yt-dlp \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]