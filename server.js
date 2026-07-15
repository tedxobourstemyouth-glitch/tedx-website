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

function normalizeQuantity(value, fallback = 1) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, 10);
}

function normalizePromoCode(value) {
  return String(value || '').trim();
}

function isApprovedPromoCode(value) {
  const promoCode = normalizePromoCode(value);
  return /^[A-Za-z]+\d{2}$/.test(promoCode);
}

function getPricingDetails(promoCode, quantityValue) {
  const quantity = normalizeQuantity(quantityValue, 1);
  const hasValidPromo = isApprovedPromoCode(promoCode);
  const isGroupPromo = hasValidPromo && quantity >= 5;
  const pricePerTicket = isGroupPromo ? 250 : hasValidPromo ? 300 : 350;

  return {
    quantity,
    hasValidPromo,
    isGroupPromo,
    pricePerTicket,
    totalPrice: quantity * pricePerTicket,
    track: isGroupPromo ? 'TEDX Gold' : hasValidPromo ? 'Promo Regular' : 'Regular'
  };
}

function buildRatingLink(req, ticketId, rating, subId = null) {
  const base = `${req.protocol}://${req.get('host')}`;
  const params = new URLSearchParams({ rating: String(rating) });
  if (subId) params.set('sub_id', String(subId));
  return `${base}/rate-event/${ticketId}?${params.toString()}`;
}

function getStarMarkup(req, ticketId, subId = null) {
  return [1, 2, 3, 4, 5]
    .map((rating) => `
      <a href="${buildRatingLink(req, ticketId, rating, subId)}"
         style="display:inline-block;margin:0 4px;font-size:32px;text-decoration:none;color:#E62B1E;"
         aria-label="Rate ${rating} out of 5 stars">★</a>`)
    .join('');
}

function getSenderAddress() {
  return process.env.EMAIL_FROM || process.env.EMAIL_USER;
}

function buildMailOptions({ to, subject, html, text, attachments = [] }) {
  const fromAddress = getSenderAddress();

  return {
    from: `"TEDx Obour STEM Youth" <${fromAddress}>`,
    sender: fromAddress,
    replyTo: fromAddress,
    to,
    subject,
    text,
    html,
    attachments,
    envelope: {
      from: fromAddress,
      to
    }
  };
}

async function sendMailStrict(mailOptions) {
  const info = await transporter.sendMail(mailOptions);
  const rejected = Array.isArray(info.rejected) ? info.rejected.filter(Boolean) : [];

  if (rejected.length) {
    throw new Error(`Recipient rejected by mail server: ${rejected.join(', ')}`);
  }

  console.log('Email sent:', {
    to: mailOptions.to,
    subject: mailOptions.subject,
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected
  });

  return info;
}

async function sendRatingEmail(ticket, req, subId = null) {
  const subjectSuffix = subId ? ` - Ticket ${subId}` : '';
  const ratingEmail = `
    <div style="font-family: Arial, sans-serif; padding: 24px; background:#f6f6f6;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;padding:28px;text-align:center;">
        <h2 style="color:#E62B1E;margin-top:0;">TEDx Obour STEM Youth</h2>
        <p style="font-size:16px;color:#1a1a1a;">Hello <strong>${ticket.full_name}</strong>,</p>
        <p style="font-size:16px;color:#444;line-height:1.7;">
          Thank you for attending TEDx Obour STEM Youth${subId ? ` (Ticket ${subId})` : ''}.
          Please rate your event experience by choosing a star below.
        </p>
        <div style="margin:22px 0 12px;line-height:1;">
          ${getStarMarkup(req, ticket.id, subId)}
        </div>
        <p style="font-size:13px;color:#777;line-height:1.7;">
          1 star means poor experience, 5 stars means excellent experience.
        </p>
      </div>
    </div>`;
  const ratingText = [
    'TEDx Obour STEM Youth',
    '',
    `Hello ${ticket.full_name},`,
    `Thank you for attending TEDx Obour STEM Youth${subId ? ` (Ticket ${subId})` : ''}.`,
    'Please rate your event experience using one of the links below:',
    '',
    ...[1, 2, 3, 4, 5].map((rating) => `${rating} star: ${buildRatingLink(req, ticket.id, rating, subId)}`)
  ].join('\n');

  await sendMailStrict(buildMailOptions({
    to: ticket.email,
    subject: `Rate Your TEDx Experience${subjectSuffix}`,
    text: ratingText,
    html: ratingEmail
  }));
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

function createTransporter() {
  const auth = process.env.EMAIL_USER && process.env.EMAIL_PASS
    ? {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    : undefined;

  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
      auth
    });
  }

  if (process.env.EMAIL_SERVICE) {
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth
  });
}

const transporter = createTransporter();

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
      checkins: [],
      rating_email_sent: false,
      rating_emails_sent: [],
      ratings: []
    };

    const pricing = getPricingDetails(formData.promo_code, formData.quantity);
    const quantity = pricing.quantity;
    newEntry.quantity = quantity;
    newEntry.promo_code = normalizePromoCode(formData.promo_code);
    newEntry.promo_valid = pricing.hasValidPromo;
    newEntry.ticket_track = pricing.track;
    newEntry.price_per_ticket = pricing.pricePerTicket;
    newEntry.total_price = pricing.totalPrice;
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
    const pendingText = [
      'TEDx Obour STEM Youth',
      '',
      `Hello ${formData.full_name},`,
      `Your ticket request is under review. Request ID: ${newEntry.id}`
    ].join('\n');

    try {
      await sendMailStrict(buildMailOptions({
        to: formData.email,
        subject: 'Request Received - TEDx Obour STEM Youth',
        text: pendingText,
        html: pendingEmail
      }));
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

    const quantity = normalizeQuantity(req.body?.quantity, normalizeQuantity(ticket.quantity, 1));
    ticket.quantity = quantity;
    ticket.checked_in = false;
    ticket.checkin_time = null;
    ticket.checkins = [];
    ticket.rating_email_sent = false;
    ticket.rating_emails_sent = [];
    ticket.ratings = [];
    ticket.event_rating = null;
    ticket.event_rated_at = null;

    if (quantity > 1) {
      for (let i = 1; i <= quantity; i++) {
        ticket.checkins.push({ sub_id: i, checked: false, time: null });
      }
    }

    const attachments = [];

    if (quantity > 1) {
      for (let i = 1; i <= quantity; i++) {
        const qrUrl = `${req.protocol}://${req.get('host')}/checkin.html?id=${ticket.id}&sub_id=${i}`;
        const finalTicketBuffer = await generateTicketImage(qrUrl, templatePath);
        attachments.push({
          filename: `TEDx_Ticket_${ticket.id}_${i}_of_${quantity}.jpg`,
          content: finalTicketBuffer,
          contentType: 'image/jpeg'
        });
      }
    } else {
      const qrUrl = `${req.protocol}://${req.get('host')}/checkin.html?id=${ticket.id}`;
      const finalTicketBuffer = await generateTicketImage(qrUrl, templatePath);
      attachments.push({
        filename: `TEDx_Ticket_${ticket.id}.jpg`,
        content: finalTicketBuffer,
        contentType: 'image/jpeg'
      });
    }

    const ticketSummaryText = quantity > 1
      ? `${quantity} official tickets are attached to this email, one ticket for each attendee.`
      : 'Your official ticket is attached to this email.';
    const ticketListMarkup = quantity > 1
      ? `
            <div style="margin: 22px 0 0; text-align: left; background: #faf7f5; border: 1px solid #eee3de; border-radius: 10px; padding: 16px;">
              <p style="margin: 0 0 10px; color: #1f1f1f; font-size: 14px; font-weight: bold;">Attached ticket files</p>
              <ul style="margin: 0; padding-left: 18px; color: #444; font-size: 14px; line-height: 1.8;">
                ${attachments.map((attachment) => `<li>${attachment.filename}</li>`).join('')}
              </ul>
            </div>`
      : '';

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
            <p style="color: #333333; font-size: 16px;">Your ticket request is APPROVED.</p>
            <p style="color: #333333; font-size: 16px;">${ticketSummaryText}</p>
            ${ticketListMarkup}
            <div style="margin-top: 30px;">
              <a href="${BASE_URL}/ticket-view.html?id=${ticket.id}" class="btn">View & Download Ticket Online</a>
            </div>
            <p style="color: #777777; font-size: 13px; margin-top: 20px;">* Please use the attached ticket files at the venue entrance.</p>
          </div>
          <!--[if mso]>
          </td></tr></table>
          <![endif]-->
        </div>
      </body>
      </html>`;
    const approvedText = [
      'TEDx Obour STEM Youth',
      '',
      `Congratulations ${ticket.full_name}!`,
      'Your ticket request is approved.',
      ticketSummaryText,
      `View online: ${BASE_URL}/ticket-view.html?id=${ticket.id}`,
      '',
      'Attached files:',
      ...attachments.map((attachment) => `- ${attachment.filename}`)
    ].join('\n');

    try {
      await sendMailStrict(buildMailOptions({
        to: ticket.email,
        subject: 'Ticket Approved! - TEDx',
        text: approvedText,
        html: approvedEmail,
        attachments
      }));
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
    const rejectedText = [
      'TEDx Obour STEM Youth',
      '',
      `Hello ${ticket.full_name},`,
      `We regret to inform you that your ticket request (ID: ${ticket.id}) could not be approved at this time.`,
      'This might be due to an invalid payment screenshot, incorrect details, or because we have reached full capacity.',
      'If you believe this is a mistake, please reply to this email to contact our team.'
    ].join('\n');

    try {
      await sendMailStrict(buildMailOptions({
        to: ticket.email,
        subject: 'Update on your ticket request - TEDx',
        text: rejectedText,
        html: rejectedEmail
      }));
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

app.get('/rate-event/:id', (req, res) => {
  const reqId = parseInt(req.params.id, 10);
  const rating = parseInt(req.query.rating, 10);
  const subId = req.query.sub_id ? parseInt(req.query.sub_id, 10) : null;

  if (![1, 2, 3, 4, 5].includes(rating)) {
    return res.status(400).send('<h1>Invalid rating.</h1>');
  }

  const db = readDatabase();
  const ticketIndex = db.findIndex((t) => t.id === reqId);
  if (ticketIndex === -1) {
    return res.status(404).send('<h1>Ticket not found.</h1>');
  }

  const ticket = db[ticketIndex];
  if (ticket.status !== 'approved') {
    return res.status(400).send('<h1>This ticket is not eligible for rating.</h1>');
  }

  ticket.ratings = Array.isArray(ticket.ratings) ? ticket.ratings : [];

  const ratedAt = new Date().toLocaleString('en-US', {
    timeZone: 'Africa/Cairo',
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  if (subId) {
    const subTicket = Array.isArray(ticket.checkins)
      ? ticket.checkins.find((st) => st.sub_id === subId)
      : null;

    if (!subTicket) {
      return res.status(404).send('<h1>Sub-ticket not found.</h1>');
    }

    const existingRatingIndex = ticket.ratings.findIndex((entry) => entry.sub_id === subId);
    const payload = { sub_id: subId, rating, rated_at: ratedAt };
    if (existingRatingIndex >= 0) ticket.ratings[existingRatingIndex] = payload;
    else ticket.ratings.push(payload);
  } else {
    ticket.event_rating = rating;
    ticket.event_rated_at = ratedAt;
  }

  db[ticketIndex] = ticket;
  writeDatabase(db);

  return res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Thank You | TEDx Obour STEM Youth</title>
      <style>
        body{margin:0;font-family:Arial,sans-serif;background:#0b0b0b;color:#fcfaf5;display:grid;place-items:center;min-height:100vh;padding:24px}
        .card{max-width:560px;width:100%;background:#111;border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:32px;text-align:center;box-shadow:0 24px 50px -36px rgba(0,0,0,.9)}
        h1{margin:0 0 16px;font-size:34px;color:#E62B1E}
        p{margin:0;color:#d0cbc2;line-height:1.8;font-size:16px}
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Thank You</h1>
        <p>Your ${rating}-star rating has been recorded successfully.</p>
      </div>
    </body>
    </html>
  `);
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

  let shouldSendRatingEmail = false;

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
    db[ticketIndex].rating_emails_sent = Array.isArray(db[ticketIndex].rating_emails_sent)
      ? db[ticketIndex].rating_emails_sent
      : [];
    if (!db[ticketIndex].rating_emails_sent.includes(subId)) {
      db[ticketIndex].rating_emails_sent.push(subId);
      shouldSendRatingEmail = true;
    }
  } else {
    if (db[ticketIndex].checked_in) return res.status(400).json({ message: 'Ticket has ALREADY been used!' });
    db[ticketIndex].checked_in = true;
    db[ticketIndex].checkin_time = new Date().toLocaleString('en-US', {
      timeZone: 'Africa/Cairo',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    if (!db[ticketIndex].rating_email_sent) {
      db[ticketIndex].rating_email_sent = true;
      shouldSendRatingEmail = true;
    }
  }

  writeDatabase(db);
  const updatedTicket = db[ticketIndex];

  if (shouldSendRatingEmail) {
    sendRatingEmail(updatedTicket, req, subId).catch((error) => {
      console.error('Failed to send rating email:', error.message);
    });
  }

  res.json({ message: 'Check-in successful!', ticket: updatedTicket });
});

app.listen(PORT, HOST, () => {
  console.log(`
The new anti-crash server is running!
Listening on ${HOST}:${PORT}
Public URL: ${BASE_URL}
Admin Dashboard: ${BASE_URL}/admin
  `);
});
