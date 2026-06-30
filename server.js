// خدمة منفصلة بترسل صور تلقائي على واتساب لرقم ثابت — مش جزء من الباك إند
// الأساسي (Python/Flask)، دي سيرفر Node.js منفصل تمامًا، لازم يتنشر كـ Railway
// service لوحده.
//
// أول مرة تشغّلها، هتحتاج تمسح كود QR بواتساب من على موبايلك (Settings ->
// Linked Devices -> Link a Device) — مرة واحدة بس، وبعدها السيشن بتتحفظ
// وهيفضل متصل تلقائي حتى لو السيرفر اعاد التشغيل (طالما الـ volume محفوظ).

const express = require('express');
const multer = require('multer');
const qrcode = require('qrcode');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.WHATSAPP_BOT_API_KEY || ''; // مفتاح بسيط لحماية الـendpoint
const DEFAULT_NUMBER = process.env.WHATSAPP_DEFAULT_NUMBER || '201002822524'; // بصيغة دولية، بدون + أو 00

let isReady = false;
let lastQrDataUrl = null;

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: '/data/wwebjs_auth' }), // لازم Volume متصلة على /data في Railway
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
    ],
  },
});

client.on('qr', async (qr) => {
  isReady = false;
  lastQrDataUrl = await qrcode.toDataURL(qr);
  console.log('=== كود QR جديد جاهز — افتح /qr في المتصفح وامسحه بواتساب ===');
});

client.on('ready', () => {
  isReady = true;
  lastQrDataUrl = null;
  console.log('=== واتساب متصل وجاهز ===');
});

client.on('disconnected', (reason) => {
  isReady = false;
  console.log('=== واتساب انفصل:', reason, '===');
});

client.initialize();

function checkApiKey(req, res, next) {
  if (!API_KEY) return next(); // لو مفيش مفتاح متظبط في الإعدادات، نسيب الحماية متعطلة (للتجربة الأولى بس)
  const provided = req.headers['x-api-key'];
  if (provided !== API_KEY) {
    return res.status(401).json({ error: 'مفتاح API غلط أو ناقص' });
  }
  next();
}

// صفحة بسيطة تعرض كود QR للمسح أول مرة
app.get('/qr', (req, res) => {
  if (isReady) {
    return res.send('<h2 style="font-family:sans-serif">واتساب متصل بالفعل ✅ — مش محتاج تمسح QR تاني.</h2>');
  }
  if (!lastQrDataUrl) {
    return res.send('<h2 style="font-family:sans-serif">جاري تجهيز كود QR... حدّث الصفحة بعد كذا ثانية.</h2>');
  }
  res.send(`
    <html dir="rtl"><body style="font-family:sans-serif; text-align:center; padding:40px;">
      <h2>امسح الكود ده بواتساب (Settings → Linked Devices → Link a Device)</h2>
      <img src="${lastQrDataUrl}" style="width:280px; height:280px;" />
    </body></html>
  `);
});

app.get('/status', (req, res) => {
  res.json({ ready: isReady, needs_qr: !isReady && !!lastQrDataUrl });
});

// استقبال صورة + إرسالها على واتساب
app.post('/send-image', checkApiKey, upload.single('image'), async (req, res) => {
  if (!isReady) {
    return res.status(503).json({ error: 'واتساب لسه مش متصل — افتح /qr وامسح الكود الأول' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'مفيش صورة مبعوتة' });
  }

  const number = (req.body.number || DEFAULT_NUMBER).replace(/[^0-9]/g, '');
  const caption = req.body.caption || '';
  const chatId = `${number}@c.us`;

  try {
    const media = new MessageMedia(req.file.mimetype, req.file.buffer.toString('base64'), req.file.originalname);
    await client.sendMessage(chatId, media, { caption });
    res.json({ success: true });
  } catch (e) {
    console.error('فشل الإرسال:', e);
    res.status(500).json({ error: 'فشل إرسال الصورة: ' + e.message });
  }
});

app.listen(PORT, () => {
  console.log(`WhatsApp bot service running on port ${PORT}`);
});
