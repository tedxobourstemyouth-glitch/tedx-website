require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const JimpRaw = require('jimp');
const Jimp = JimpRaw.Jimp || JimpRaw.default || JimpRaw;
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dataDir = path.join(__dirname, '.data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
app.use('/uploads', express.static(path.join(__dirname, '.data', 'uploads')));
app.use(express.static(__dirname));

const dbPath = path.join(__dirname, '.data', 'database.json');

function readDatabase() {
  try {
    if (!fs.existsSync(dbPath)) return [];
    const data = fs.readFileSync(dbPath, 'utf8');
    return data.trim() ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Issue detected in database file, a new clean file has been created.');
    return [];
  }
}

function writeDatabase(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

function deleteUploadedFile(fileName) {
  if (!fileName) return;
  const uploadPath = path.join(__dirname, '.data', 'uploads', path.basename(fileName));
  if (!fs.existsSync(uploadPath)) return;

  try {
    fs.unlinkSync(uploadPath);
  } catch (error) {
    console.error('Failed to delete uploaded file:', uploadPath, error.message);
  }
}

function removeTicketsFromDatabase(shouldRemove) {
  const db = readDatabase();
  const removedTickets = [];
  const keptTickets = [];

  db.forEach((ticket) => {
    if (shouldRemove(ticket)) removedTickets.push(ticket);
    else keptTickets.push(ticket);
  });

  removedTickets.forEach((ticket) => deleteUploadedFile(ticket.screenshotPath));
  writeDatabase(keptTickets);

  return { keptTickets, removedTickets };
}

function getNextTicketId(db) {
  const numericIds = db
    .map((ticket) => Number(ticket.id))
    .filter((id) => Number.isFinite(id) && id >= 1000);

  if (!numericIds.length) return 1000;
  return Math.max(...numericIds) + 1;
}

function validateSubmission(formData, file) {
  const fieldErrors = {};
  const requiredFields = {
    full_name: 'Full Name is required.',
    email: 'Email Address is required.',
    phone: 'Mobile Number is required.',
    payment_date: 'Payment Date is required.',
    transfer_source: 'Transfer Phone / Account No. is required.'
  };

  Object.entries(requiredFields).forEach(([field, message]) => {
    if (!String(formData[field] || '').trim()) {
      fieldErrors[field] = message;
    }
  });

  if (!file) {
    fieldErrors.payment_screenshot = 'Transfer Screenshot is required.';
  }

  return fieldErrors;
}

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
app.use('/checkin.html', adminAuth);

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const uploadDir = path.join(__dirname, '.data', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'ticket-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Invalid file type.'), false);
  }
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

app.post('/submit', (req, res, next) => {
  upload.single('payment_screenshot')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
  });
}, async (req, res) => {
  try {
    const formData = req.body;
    const file = req.file;
    const fieldErrors = validateSubmission(formData, file);

    if (Object.keys(fieldErrors).length > 0) {
      if (file) deleteUploadedFile(file.filename);
      return res.status(400).json({
        message: 'Please complete all required fields.',
        fieldErrors
      });
    }

    const db = readDatabase();
    const newEntry = {
      id: getNextTicketId(db),
      created_at: Date.now(),
      date: new Date().toLocaleString('en-US', {
        timeZone: 'Africa/Cairo',
        dateStyle: 'medium',
        timeStyle: 'short'
      }),
      status: 'pending',
      ...formData,
      screenshotPath: file ? file.filename : null,
      checked_in: false,
      checkins: []
    };

    const quantity = parseInt(formData.quantity, 10) || 1;
    if (quantity > 1) {
      for (let i = 1; i <= quantity; i++) {
        newEntry.checkins.push({ sub_id: i, checked: false, time: null });
      }
    }

    db.push(newEntry);
    writeDatabase(db);
    console.log('New ticket saved for:', formData.full_name);

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
        html: pendingEmail
      });
      console.log('Receipt email sent to:', formData.email);
    } catch (emailErr) {
      console.log('Email not sent but ticket saved. Reason:', emailErr.message);
    }

    res.status(200).json({ message: 'Success', ticketId: newEntry.id, date: newEntry.date });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

async function generateTicketImage(qrUrl, templatePath) {
  const ticketImg = await Jimp.read(templatePath);

  const ticketW = ticketImg.bitmap.width;
  const ticketH = ticketImg.bitmap.height;
  const QR_SIZE = Math.floor(ticketW * (1.96 / 8.5));
  const QR_X = Math.floor(ticketW * (6.22 / 8.5));
  const QR_Y = Math.floor(ticketH * (0.65 / 2.75));

  const qrCodeBuffer = await QRCode.toBuffer(qrUrl, {
    type: 'png',
    color: { dark: '#000000', light: '#ffffff' },
    margin: 0,
    width: QR_SIZE
  });
  const qrImg = await Jimp.read(qrCodeBuffer);

  if (qrImg.bitmap.width !== QR_SIZE || qrImg.bitmap.height !== QR_SIZE) {
    try {
      qrImg.resize(QR_SIZE, QR_SIZE);
    } catch (error) {
      qrImg.resize({ w: QR_SIZE, h: QR_SIZE });
    }
  }

  ticketImg.composite(qrImg, QR_X, QR_Y);

  const mimeType = 'image/jpeg';
  const finalTicketBuffer = typeof ticketImg.getBufferAsync === 'function'
    ? await ticketImg.getBufferAsync(mimeType)
    : await ticketImg.getBuffer(mimeType);

  return finalTicketBuffer;
}

app.post('/api/admin/approve/:id', adminAuth, async (req, res) => {
  try {
    const reqId = parseInt(req.params.id, 10);
    const db = readDatabase();
    const ticketIndex = db.findIndex((t) => t.id === reqId);

    if (ticketIndex === -1) return res.status(404).json({ message: 'Ticket not found' });
    if (db[ticketIndex].status === 'approved') return res.status(400).json({ message: 'Already approved' });

    const ticket = db[ticketIndex];

    let templatePath = path.join(__dirname, 'template Event Ticket.jpg');
    if (!fs.existsSync(templatePath)) templatePath = path.join(__dirname, 'Event Ticket.jpg');
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Ticket template not found! Please make sure '${path.basename(templatePath)}' exists in the folder.`);
    }

    if (req.body && req.body.quantity) {
      const newQty = parseInt(req.body.quantity, 10);
      if (newQty > 0) {
        ticket.quantity = newQty;
        ticket.checkins = [];
        if (newQty > 1) {
          for (let i = 1; i <= newQty; i++) {
            ticket.checkins.push({ sub_id: i, checked: false, time: null });
          }
        }
      }
    }

    const quantity = parseInt(ticket.quantity, 10) || 1;
    const attachments = [];

    if (quantity > 1) {
      for (let i = 1; i <= quantity; i++) {
        const qrUrl = `${req.protocol}://${req.get('host')}/checkin.html?id=${ticket.id}&sub_id=${i}`;
        const finalTicketBuffer = await generateTicketImage(qrUrl, templatePath);
        attachments.push({
          filename: `Official_Ticket_${ticket.id}_(${i}_of_${quantity}).jpg`,
          content: finalTicketBuffer,
          cid: `ticket_final_${i}`
        });
      }
    } else {
      const qrUrl = `${req.protocol}://${req.get('host')}/checkin.html?id=${ticket.id}`;
      const finalTicketBuffer = await generateTicketImage(qrUrl, templatePath);
      attachments.push({
        filename: `Official_Ticket_${ticket.id}.jpg`,
        content: finalTicketBuffer,
        cid: 'ticket_final'
      });
    }

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
            <img src="cid:${attachments[0].cid}" alt="Event Ticket" class="ticket-img" />
            <div style="margin-top: 30px;">
              <a href="${BASE_URL}/ticket-view.html?id=${ticket.id}" class="btn">View & Download Ticket Online</a>
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
        attachments
      });
      console.log(`${quantity} ticket(s) successfully sent to:`, ticket.email);
    } catch (emailErr) {
      console.log('Failed to send email:', emailErr.message);
      return res.status(500).json({ message: 'Failed to send email, please check the password.' });
    }

    db[ticketIndex].status = 'approved';
    writeDatabase(db);
    res.json({ message: `Ticket approved, ${quantity} QR(s) generated, and email sent successfully!` });
  } catch (error) {
    console.error('Error during approval:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.post('/api/admin/reject/:id', adminAuth, async (req, res) => {
  try {
    const reqId = parseInt(req.params.id, 10);
    const db = readDatabase();
    const ticketIndex = db.findIndex((t) => t.id === reqId);

    if (ticketIndex === -1) return res.status(404).json({ message: 'Ticket not found' });
    if (db[ticketIndex].status === 'approved') {
      return res.status(400).json({ message: 'Cannot reject an already approved ticket' });
    }
    if (db[ticketIndex].status === 'rejected') {
      return res.status(400).json({ message: 'Already rejected' });
    }

    const ticket = db[ticketIndex];
    const rejectedEmail = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #E62B1E;">TEDx Obour STEM Youth</h2>
        <p>Hello <strong>${ticket.full_name}</strong>,</p>
        <p>We regret to inform you that your ticket request (ID: ${ticket.id}) could not be approved at this time.</p>
        <p>This might be due to an invalid payment screenshot, incorrect details, or because we have reached full capacity.</p>
        <p>If you believe this is a mistake, please reply to this email to contact our team.</p>
      </div>`;

    try {
      await transporter.sendMail({
        from: `"TEDx Obour STEM" <${process.env.EMAIL_USER}>`,
        to: ticket.email,
        subject: 'Update on your ticket request - TEDx',
        html: rejectedEmail
      });
      console.log('Rejection email sent to:', ticket.email);
    } catch (emailErr) {
      console.log('Failed to send rejection email:', emailErr.message);
    }

    db[ticketIndex].status = 'rejected';
    writeDatabase(db);
    res.json({ message: 'Ticket rejected successfully and user notified!' });
  } catch (error) {
    console.error('Error during rejection:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/admin', adminAuth, (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/api/admin/data', adminAuth, (req, res) => res.json(readDatabase()));
app.get('/api/admin/export', adminAuth, (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="tedx_responses_${Date.now()}.json"`);
  res.send(JSON.stringify(readDatabase(), null, 2));
});
app.post('/api/admin/delete-all', adminAuth, (req, res) => {
  const { removedTickets } = removeTicketsFromDatabase(() => true);
  res.json({ message: `Deleted ${removedTickets.length} submission(s).`, deletedCount: removedTickets.length });
});
app.post('/api/admin/delete/:id', adminAuth, (req, res) => {
  const reqId = parseInt(req.params.id, 10);
  const { removedTickets } = removeTicketsFromDatabase((ticket) => ticket.id === reqId);

  if (!removedTickets.length) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }

  res.json({ message: `Request #${reqId} deleted successfully.` });
});
app.post('/api/admin/clear-old', adminAuth, (req, res) => {
  const cutoffDays = 30;
  const cutoffTime = Date.now() - cutoffDays * 24 * 60 * 60 * 1000;
  const { removedTickets } = removeTicketsFromDatabase((ticket) => {
    const createdAt = Number(ticket.created_at || ticket.id);
    return Number.isFinite(createdAt) && createdAt < cutoffTime;
  });

  res.json({
    message: removedTickets.length
      ? `Cleared ${removedTickets.length} record(s) older than ${cutoffDays} days.`
      : `No records older than ${cutoffDays} days were found.`,
    deletedCount: removedTickets.length,
    cutoffDays
  });
});

app.get('/api/ticket/:id', (req, res) => {
  const reqId = parseInt(req.params.id, 10);
  const db = readDatabase();
  const ticket = db.find((t) => t.id === reqId);
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
  if (ticket.status !== 'approved') return res.status(403).json({ message: 'Ticket is still pending approval' });

  res.json({ id: ticket.id, full_name: ticket.full_name, qr_data: `TEDx-Request-${ticket.id}` });
});

app.get('/api/ticket/render/:id', async (req, res) => {
  try {
    const reqId = parseInt(req.params.id, 10);
    const db = readDatabase();
    const ticket = db.find((t) => t.id === reqId);
    if (!ticket || ticket.status !== 'approved') return res.status(404).send('Ticket not available');

    let templatePath = path.join(__dirname, 'template Event Ticket.jpg');
    if (!fs.existsSync(templatePath)) templatePath = path.join(__dirname, 'Event Ticket.jpg');
    if (!fs.existsSync(templatePath)) return res.status(404).send('Ticket template image not found.');

    const ticketImg = await Jimp.read(templatePath);
    const ticketW = ticketImg.bitmap.width;
    const ticketH = ticketImg.bitmap.height;
    const QR_SIZE = Math.floor(ticketW * (1.96 / 8.5));
    const QR_X = Math.floor(ticketW * (6.22 / 8.5));
    const QR_Y = Math.floor(ticketH * (0.65 / 2.75));

    const qrUrl = `${req.protocol}://${req.get('host')}/checkin.html?id=${ticket.id}`;
    const qrCodeBuffer = await QRCode.toBuffer(qrUrl, {
      type: 'png',
      margin: 0,
      width: QR_SIZE,
      color: { dark: '#000000', light: '#ffffff' }
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
    console.error('Error rendering ticket image:', error);
    res.status(500).send('Error rendering ticket');
  }
});

app.get('/api/admin/checkin/:id', adminAuth, (req, res) => {
  try {
    const reqId = parseInt(req.params.id, 10);
    const subId = req.query.sub_id ? parseInt(req.query.sub_id, 10) : null;
    const db = readDatabase();
    const ticket = db.find((t) => t.id === reqId);

    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (ticket.status !== 'approved') {
      return res.status(400).json({ message: 'This QR code is not approved for check-in.' });
    }

    if (subId) {
      const subTicket = ticket.checkins.find((st) => st.sub_id === subId);
      if (!subTicket) return res.status(404).json({ message: 'Sub-ticket not found' });
      return res.json({ ...ticket, ...subTicket, is_sub_ticket: true });
    }

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/admin/checkin/:id', adminAuth, (req, res) => {
  const reqId = parseInt(req.params.id, 10);
  const subId = req.query.sub_id ? parseInt(req.query.sub_id, 10) : null;
  const db = readDatabase();
  const ticketIndex = db.findIndex((t) => t.id === reqId);

  if (ticketIndex === -1) return res.status(404).json({ message: 'Ticket not found' });
  if (db[ticketIndex].status !== 'approved') {
    return res.status(400).json({ message: 'This QR code is not approved for check-in.' });
  }

  if (subId) {
    const subTicketIndex = db[ticketIndex].checkins.findIndex((st) => st.sub_id === subId);
    if (subTicketIndex === -1) return res.status(404).json({ message: 'Sub-ticket not found' });
    if (db[ticketIndex].checkins[subTicketIndex].checked) {
      return res.status(400).json({ message: 'This specific ticket has ALREADY been used!' });
    }
    db[ticketIndex].checkins[subTicketIndex].checked = true;
    db[ticketIndex].checkins[subTicketIndex].time = new Date().toLocaleString('en-US', {
      timeZone: 'Africa/Cairo',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } else {
    if (db[ticketIndex].checked_in) return res.status(400).json({ message: 'Ticket has ALREADY been used!' });
    db[ticketIndex].checked_in = true;
    db[ticketIndex].checkin_time = new Date().toLocaleString('en-US', {
      timeZone: 'Africa/Cairo',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  }

  writeDatabase(db);
  res.json({ message: 'Check-in successful!', ticket: db[ticketIndex] });
});

app.listen(PORT, HOST, () => {
  console.log(`
The new anti-crash server is running!
Listening on ${HOST}:${PORT}
Public URL: ${BASE_URL}
Admin Dashboard: ${BASE_URL}/admin
  `);
});
