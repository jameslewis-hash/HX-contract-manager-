const cron = require('node-cron');
const nodemailer = require('nodemailer');
const { getDb } = require('../db');

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function buildEmailHtml(contract, daysLeft) {
  const urgency = daysLeft <= 30 ? 'URGENT: ' : '';
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#1a0a2e;color:#ffffff;border-radius:8px;overflow:hidden">
      <div style="background:#542E91;padding:24px">
        <h1 style="margin:0;font-size:20px;color:#FDDC06">HX Contract Manager</h1>
        <p style="margin:4px 0 0;color:#c0b0e0;font-size:14px">Contract Expiry Warning</p>
      </div>
      <div style="padding:24px">
        <h2 style="color:#FDDC06;margin-top:0">${urgency}Contract expires in ${daysLeft} days</h2>
        <table style="width:100%;border-collapse:collapse;margin-top:16px">
          <tr><td style="padding:10px;border:1px solid #3d2870;color:#b0a0cc;width:140px">Contract</td>
              <td style="padding:10px;border:1px solid #3d2870;font-weight:600">${contract.title}</td></tr>
          <tr><td style="padding:10px;border:1px solid #3d2870;color:#b0a0cc">Vendor</td>
              <td style="padding:10px;border:1px solid #3d2870">${contract.vendor}</td></tr>
          <tr><td style="padding:10px;border:1px solid #3d2870;color:#b0a0cc">Expiry Date</td>
              <td style="padding:10px;border:1px solid #3d2870;color:#f59e0b;font-weight:600">${contract.end_date}</td></tr>
          <tr><td style="padding:10px;border:1px solid #3d2870;color:#b0a0cc">Owner</td>
              <td style="padding:10px;border:1px solid #3d2870">${contract.owner_name || 'Unassigned'}</td></tr>
          ${contract.contract_value ? `<tr><td style="padding:10px;border:1px solid #3d2870;color:#b0a0cc">Value</td>
              <td style="padding:10px;border:1px solid #3d2870">£${Number(contract.contract_value).toLocaleString()}</td></tr>` : ''}
        </table>
        <p style="margin-top:24px;color:#b0a0cc;font-size:14px">
          ${daysLeft <= 30
            ? 'This contract requires <strong>immediate attention</strong>. Please review and arrange renewal or termination.'
            : 'Please begin the renewal process to avoid any service disruption.'
          }
        </p>
      </div>
      <div style="background:#231540;padding:16px;font-size:12px;color:#7060a0;text-align:center">
        Holiday Extras Contract Manager &mdash; automated alert
      </div>
    </div>
  `;
}

async function sendExpiryWarnings() {
  const db = getDb();
  const contracts = db.prepare('SELECT * FROM contracts').all();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toAlert = [];

  for (const contract of contracts) {
    const end = new Date(contract.end_date);
    end.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 90 || diffDays === 30) {
      toAlert.push({ contract, daysLeft: diffDays });
    }
  }

  if (toAlert.length === 0) {
    console.log('[Cron] No expiry warnings to send today');
    return;
  }

  if (!process.env.SMTP_USER) {
    console.log('[Cron] SMTP not configured — skipping email send. Contracts due for alert:', toAlert.map(a => a.contract.title).join(', '));
    return;
  }

  const fallbackEmail = process.env.ALERT_EMAIL || process.env.SMTP_USER;
  const transporter = createTransporter();

  for (const { contract, daysLeft } of toAlert) {
    // Send to the contract owner's email if set, otherwise fall back to ALERT_EMAIL
    const to = contract.owner_email || fallbackEmail;
    await transporter.sendMail({
      from: `"HX Contract Manager" <${process.env.SMTP_USER}>`,
      to,
      subject: `${daysLeft <= 30 ? 'URGENT: ' : ''}Contract Expiry: "${contract.title}" expires in ${daysLeft} days`,
      html: buildEmailHtml(contract, daysLeft),
    });
    console.log(`[Cron] Sent ${daysLeft}-day warning for "${contract.title}" to ${to}`);
  }
}

function startCronJob() {
  // Run daily at 09:00
  cron.schedule('0 9 * * *', async () => {
    console.log('[Cron] Running daily contract expiry check...');
    try {
      await sendExpiryWarnings();
    } catch (err) {
      console.error('[Cron] Error during expiry check:', err.message);
    }
  });

  console.log('[Cron] Daily expiry warning job scheduled (runs at 09:00 daily)');
}

module.exports = { startCronJob, sendExpiryWarnings };
