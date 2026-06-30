# بنستخدم Dockerfile بدل الإعداد التلقائي عشان نضمن تثبيت Chrome + كل
# المكتبات اللي محتاجها يشتغل (whatsapp-web.js محتاج متصفح حقيقي شغال).
FROM node:20-bookworm-slim

# تثبيت Chromium — مكتبة apt بتاعة chromium بتجيب معاها تلقائي كل الـ shared
# libraries اللي محتاجة (مش محتاجين نحدد كل مكتبة بالاسم يدوي، ده اللي كان
# بيسبب مشاكل لو اتكتب اسم باكدج غلط زي libxrandr6 بدل libxrandr2).
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
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
