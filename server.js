require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const JimpRaw = require('jimp');
const Jimp = JimpRaw.Jimp || JimpRaw.default || JimpRaw; // Adapts to both Jimp v0.x and v1.x exports
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// 1. Basic Settings
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(__dirname)); // To serve the entire website

// 2. Server Anti-Crash System (If the database file is corrupted, it fixes itself)
const dbPath = path.join(__dirname, 'database.json');
function readDatabase() {
  try {
    if (!fs.existsSync(dbPath)) return [];
    const data = fs.readFileSync(dbPath, 'utf8');
    return data.trim() ? JSON.parse(data) : [];
  } catch (error) {
    console.error('⚠️ Issue detected in database file, a new clean file has been created.');
    return [];
  }
}
function writeDatabase(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// 3. Admin Dashboard Protection System
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('Authentication required.');
  }
  const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  if (auth[0] === process.env.ADMIN_USER && auth[1] === process.env.ADMIN_PASS) {
    return next();
  }
  res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
  return res.status(401).send('Access Denied');
};

app.use('/admin.html', adminAuth);

// حماية صفحة الـ Scan عشان محدش يقدر يفتحها غير الأدمن
app.use('/checkin.html', adminAuth); 

// 4. Image Upload Settings (Fully Secure)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ticket-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type.'), false);
  }
});

// 5. Email Settings
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// 6. New Ticket Submission Route (Anti-Crash)
app.post('/submit', (req, res, next) => {
  upload.single('payment_screenshot')(req, res, function (err) {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, async (req, res) => {
  try {
    const formData = req.body;
    const file = req.file;

    // Save Ticket
    let db = readDatabase();
    const newEntry = {
      id: Date.now(),
      date: new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' }),
      status: 'pending',
      ...formData,
      screenshotPath: file ? file.filename : null
    };
    db.push(newEntry);
    writeDatabase(db);
    console.log('✅ New ticket saved for:', formData.full_name);

    // Attempt to send email (won't crash the server if it fails)
    const pendingEmail = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #E62B1E;">TEDx Obour STEM Youth</h2>
        <p>Hello <strong>${formData.full_name}</strong>,</p>
        <p>Your ticket request is under review. Request ID: ${newEntry.id}</p>
      </div>`;

    try {
      await transporter.sendMail({
        from: `"TEDx Obour STEM" <${process.env.EMAIL_USER}>`,
        to: formData.email,
        subject: 'Request Received - TEDx Obour STEM Youth',
        html: pendingEmail,
      });
      console.log('📧 Receipt email sent to:', formData.email);
    } catch (emailErr) {
      console.log('⚠️ Email not sent but ticket saved. Reason:', emailErr.message);
    }
    
    res.status(200).json({ message: 'Success' });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// 7. Ticket Approval Route (Anti-Crash)
app.post('/api/admin/approve/:id', adminAuth, async (req, res) => {
  try {
    const reqId = parseInt(req.params.id);
    let db = readDatabase();
    const ticketIndex = db.findIndex(t => t.id === reqId);
    
    if (ticketIndex === -1) return res.status(404).json({ message: 'Ticket not found' });
    if (db[ticketIndex].status === 'approved') return res.status(400).json({ message: 'Already approved' });

    const ticket = db[ticketIndex];

    // 1. Read Template (Fallback to 'Event Ticket.jpg' if the renamed one isn't found)
    let templatePath = path.join(__dirname, 'template Event Ticket.jpg');
    if (!fs.existsSync(templatePath)) templatePath = path.join(__dirname, 'Event Ticket.jpg');
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Ticket template not found! Please make sure '${path.basename(templatePath)}' exists in the folder.`);
    }
    const ticketImg = await Jimp.read(templatePath);

    // حساب الأبعاد ديناميكياً بناءً على مقاسات Canva اللي بعتها (Width: 8.5in, Height: 2.75in)
    // الكود ده هيظبط الـ QR في المربع الأحمر بالمللي مهما كانت جودة أو حجم صورة التذكرة
    const ticketW = ticketImg.bitmap.width;
    const ticketH = ticketImg.bitmap.height;
    const QR_SIZE = Math.floor(ticketW * (1.96 / 8.5));
    const QR_X = Math.floor(ticketW * (6.22 / 8.5));
    const QR_Y = Math.floor(ticketH * (0.65 / 2.75));
    
    // تغيير الـ QR ليكون رابط حقيقي يفتح صفحة الفحص الخاصة بالتذكرة
    const qrUrl = `${req.protocol}://${req.get('host')}/checkin.html?id=${ticket.id}`;
    const qrCodeBuffer = await QRCode.toBuffer(qrUrl, {
      type: 'png',
      color: { dark: '#000000', light: '#ffffff' },
      margin: 0,
      width: QR_SIZE
    });
    const qrImg = await Jimp.read(qrCodeBuffer);
    
    // Force exact 543x543 size in case the QRCode library rounds pixels
    if (qrImg.bitmap.width !== QR_SIZE || qrImg.bitmap.height !== QR_SIZE) {
      try { qrImg.resize(QR_SIZE, QR_SIZE); } catch (e) { qrImg.resize({ w: QR_SIZE, h: QR_SIZE }); }
    }
    
    ticketImg.composite(qrImg, QR_X, QR_Y);

    // 4. Export the final composited image preserving all original dimensions
    const mimeType = 'image/jpeg';
    const finalTicketBuffer = typeof ticketImg.getBufferAsync === 'function' 
      ? await ticketImg.getBufferAsync(mimeType) // For Jimp v0.16.x
      : await ticketImg.getBuffer(mimeType);     // For Jimp v1.x.x

    const approvedEmail = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { margin: 0; padding: 0; background-color: #f9f9f9; font-family: Arial, sans-serif; -webkit-text-size-adjust: 100%; }
          .email-wrapper { width: 100%; background-color: #f9f9f9; padding: 20px 0; }
          .email-content { width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 12px; text-align: center; box-sizing: border-box; }
          .ticket-img { width: 100%; max-width: 600px; height: auto; border-radius: 12px; display: block; margin: 20px auto; box-shadow: 0 10px 20px rgba(0,0,0,0.2); }
          .btn { display: inline-block; padding: 14px 28px; background-color: #E62B1E; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: bold; font-family: sans-serif; }
          @media only screen and (max-width: 600px) {
            .email-wrapper { padding: 10px 0; }
            .email-content { padding: 15px; border-radius: 8px; }
            .btn { display: block; width: 100%; box-sizing: border-box; }
          }
        </style>
      </head>
      <body>
        <div class="email-wrapper">
          <!--[if mso]>
          <table align="center" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;"><tr><td>
          <![endif]-->
          <div class="email-content">
            <h2 style="color: #E62B1E; margin-top: 0;">TEDx Obour STEM Youth</h2>
            <p style="color: #333333; font-size: 16px;">Congratulations <strong>${ticket.full_name}</strong>!</p>
            <p style="color: #333333; font-size: 16px;">Your ticket is APPROVED. Please save your official ticket below to show at the door.</p>
            <img src="cid:ticket_final" alt="Event Ticket" class="ticket-img" />
            <div style="margin-top: 30px;">
              <a href="http://localhost:${PORT}/ticket-view.html?id=${ticket.id}" class="btn">View & Download Ticket Online</a>
            </div>
            <p style="color: #777777; font-size: 13px; margin-top: 20px;">* Your high-resolution ticket is also attached to this email.</p>
          </div>
          <!--[if mso]>
          </td></tr></table>
          <![endif]-->
        </div>
      </body>
      </html>`;

    try {
      await transporter.sendMail({
        from: `"TEDx Obour STEM" <${process.env.EMAIL_USER}>`,
        to: ticket.email,
        subject: 'Ticket Approved! - TEDx',
        html: approvedEmail,
        attachments: [
          {
            filename: `Official_Ticket_${ticket.id}.jpg`,
            content: finalTicketBuffer,
            cid: 'ticket_final'
          }
        ]
      });
      console.log('📧 Ticket successfully sent to:', ticket.email);
    } catch (emailErr) {
      console.log('⚠️ Failed to send email:', emailErr.message);
      return res.status(500).json({ message: 'Failed to send email, please check the password.' });
    }

    db[ticketIndex].status = 'approved';
    writeDatabase(db);
    res.json({ message: 'Ticket approved, QR generated, and email sent successfully!' });
  } catch (error) {
    console.error('❌ Error during approval:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// 8. Admin Dashboard Routes
app.get('/admin', adminAuth, (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/api/admin/data', adminAuth, (req, res) => res.json(readDatabase()));

// 9. Public Ticket View API
app.get('/api/ticket/:id', (req, res) => {
  const reqId = parseInt(req.params.id);
  const db = readDatabase();
  const ticket = db.find(t => t.id === reqId);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
  if (ticket.status !== 'approved') return res.status(403).json({ message: 'Ticket is still pending approval' });
  
  res.json({ id: ticket.id, full_name: ticket.full_name, qr_data: `TEDx-Request-${ticket.id}` });
});

// 10. Dynamic Ticket Render API (Composites QR onto Template on the fly)
app.get('/api/ticket/render/:id', async (req, res) => {
  try {
    const reqId = parseInt(req.params.id);
    const db = readDatabase();
    const ticket = db.find(t => t.id === reqId);
    if (!ticket || ticket.status !== 'approved') return res.status(404).send('Ticket not available');

    let templatePath = path.join(__dirname, 'template Event Ticket.jpg');
    if (!fs.existsSync(templatePath)) templatePath = path.join(__dirname, 'Event Ticket.jpg');
    
    if (!fs.existsSync(templatePath)) {
      return res.status(404).send('Ticket template image not found.');
    }
    
    const ticketImg = await Jimp.read(templatePath);
    
    const ticketW = ticketImg.bitmap.width;
    const ticketH = ticketImg.bitmap.height;
    const QR_SIZE = Math.floor(ticketW * (1.96 / 8.5));
    const QR_X = Math.floor(ticketW * (6.22 / 8.5));
    const QR_Y = Math.floor(ticketH * (0.65 / 2.75));
    
    const qrUrl = `${req.protocol}://${req.get('host')}/checkin.html?id=${ticket.id}`;
    const qrCodeBuffer = await QRCode.toBuffer(qrUrl, { 
      type: 'png', margin: 0, width: QR_SIZE, color: { dark: '#000000', light: '#ffffff' } 
    });
    const qrImg = await Jimp.read(qrCodeBuffer);

    ticketImg.composite(qrImg, QR_X, QR_Y);
    
    const mimeType = 'image/jpeg';
    const buffer = typeof ticketImg.getBufferAsync === 'function' 
      ? await ticketImg.getBufferAsync(mimeType)
      : await ticketImg.getBuffer(mimeType);

    res.writeHead(200, {
      'Content-Type': 'image/jpeg',
      'Content-Disposition': `inline; filename="TEDx_Ticket_${ticket.id}.jpg"`
    });
    res.end(buffer);
  } catch (error) {
    console.error('❌ Error rendering ticket image:', error);
    res.status(500).send('Error rendering ticket');
  }
});

// 11. Check-in Routes (مسارات تأكيد الحضور على الباب)
app.get('/api/admin/checkin/:id', adminAuth, (req, res) => {
  const reqId = parseInt(req.params.id);
  const db = readDatabase();
  const ticket = db.find(t => t.id === reqId);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
  res.json(ticket);
});

app.post('/api/admin/checkin/:id', adminAuth, (req, res) => {
  const reqId = parseInt(req.params.id);
  let db = readDatabase();
  const ticketIndex = db.findIndex(t => t.id === reqId);
  
  if (ticketIndex === -1) return res.status(404).json({ message: 'Ticket not found' });

  if (db[ticketIndex].checked_in) {
    return res.status(400).json({ message: 'Ticket has ALREADY been used!' });
  }

  // حرق التذكرة وتأكيد الدخول
  db[ticketIndex].checked_in = true;
  db[ticketIndex].checkin_time = new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' });
  
  writeDatabase(db);
  res.json({ message: 'Check-in successful!', ticket: db[ticketIndex] });
});

app.listen(PORT, () => {
  console.log(`
🚀 The new anti-crash server is running!
📡 http://localhost:${PORT}
🛠️  Admin Dashboard: http://localhost:${PORT}/admin
  `);
});