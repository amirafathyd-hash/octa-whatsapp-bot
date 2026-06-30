# بنستخدم Dockerfile بدل الإعداد التلقائي عشان نضمن تثبيت Chrome + كل
# المكتبات اللي محتاجها يشتغل (whatsapp-web.js محتاج متصفح حقيقي شغال).
FROM node:20-bookworm-slim

# تثبيت Chromium + كل الـ shared libraries المطلوبة لتشغيله headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr6 \
    libxshmfence1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# نقول لـ Puppeteer "متنزّلش نسخة Chrome بتاعتك، استخدم اللي مثبّت في الـimage"
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY server.js ./

EXPOSE 8080
CMD ["node", "server.js"]
