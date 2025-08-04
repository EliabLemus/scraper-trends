FROM node:20-slim

# ── Puppeteer system deps ──
RUN apt-get update && apt-get install -y \
    wget \
    gnupg2 \
    libglib2.0-0 \
    libnss3 \
    libxss1 \
    libgconf-2-4 \
    libasound2 \
    libcups2 \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libxrandr2 \
    libxss1 \
    libxshmfence1 \
    fonts-liberation \
    libappindicator3-1 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libdbus-glib-1-2 \
    libgdk-pixbuf2.0-0 \
    libgtk-3-0 \
    libpango1.0-0 \
    libx11-6 \
    libxext6 \
    libxrender1 \
    libxrandr2 \
    libgbm1 \  
    --no-install-recommends \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

# Variables que puedas querer pasar desde docker-compose
ENV NITTER_LOCAL=http://192.168.2.23:9090

CMD ["node", "server.js"]
