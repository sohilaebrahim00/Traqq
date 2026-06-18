const nodemailer = require('nodemailer');

let _transport = null;

function getTransport() {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }
  if (!_transport) {
    _transport = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587', 10),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  return _transport;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
}

function formatTime(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
}

function getBaseUrl() {
  return (process.env.FRONTEND_URL || 'https://mytraqq.com').replace(/\/$/, '');
}

function fromAddress() {
  return process.env.EMAIL_FROM || `"TRAQQ Airport Shuttle" <${process.env.EMAIL_USER}>`;
}

function emailWrapper(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>TRAQQ</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td style="padding:20px 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;margin:0 auto;">
          <tr>
            <td style="background-color:#111111;padding:32px 40px;text-align:center;border-radius:12px 12px 0 0;">
              <h1 style="margin:0;font-size:28px;font-weight:900;letter-spacing:4px;color:#c9a84c;">TRAQQ</h1>
              <p style="margin:6px 0 0;font-size:11px;color:#888888;letter-spacing:2px;text-transform:uppercase;">Premium Airport Shuttle</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#1a1a1a;padding:36px 40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background-color:#111111;padding:24px 40px;text-align:center;border-radius:0 0 12px 12px;">
              <p style="margin:0;font-size:12px;color:#555555;">© ${new Date().getFullYear()} TRAQQ Premium Airport Shuttle. All rights reserved.</p>
              <p style="margin:8px 0 0;font-size:12px;color:#555555;">Questions? <a href="mailto:support@mytraqq.com" style="color:#c9a84c;text-decoration:none;">support@mytraqq.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function detailRow(label, value, highlightValue = false) {
  const valueColor = highlightValue ? '#c9a84c' : '#ffffff';
  return `
    <tr>
      <td style="padding:11px 16px;color:#888888;font-size:13px;width:38%;border-bottom:1px solid #2a2a2a;">${label}</td>
      <td style="padding:11px 16px;color:${valueColor};font-size:13px;font-weight:${highlightValue ? 'bold' : 'normal'};border-bottom:1px solid #2a2a2a;">${value}</td>
    </tr>`;
}

function trackingButton(href, label = 'Track Your Ride →') {
  return `<p style="text-align:center;margin:28px 0 0;">
    <a href="${href}" style="display:inline-block;background-color:#c9a84c;color:#000000;font-weight:bold;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:6px;letter-spacing:1px;">${label}</a>
  </p>`;
}

// ── 1. Booking Confirmation ──────────────────────────────────────────────────

async function sendBookingConfirmation(booking) {
  const transport = getTransport();
  if (!transport) {
    console.log('[email] Not configured — skipping booking confirmation for', booking.bookingRef);
    return;
  }
  if (!booking.email) return;

  const base = getBaseUrl();
  const trackingUrl = `${base}/booking-tracking/${booking.bookingRef}`;

  const rows = [
    detailRow('Booking Reference', booking.bookingRef, true),
    detailRow('Pickup Date', formatDate(booking.pickupDate)),
    detailRow('Pickup Time', formatTime(booking.pickupTime)),
    detailRow('Pickup Address', booking.pickupAddress),
    booking.destinationAddress ? detailRow('Destination', booking.destinationAddress) : '',
    detailRow('Terminal', `Terminal ${booking.dropoffTerminal}`),
    detailRow('Passengers', String(booking.passengerCount))
  ].join('');

  const qrBlock = booking.qrCode ? `
    <div style="text-align:center;margin:32px 0 0;">
      <p style="margin:0 0 14px;color:#888888;font-size:11px;text-transform:uppercase;letter-spacing:1px;">Your Boarding QR Code</p>
      <img src="${booking.qrCode}" alt="Booking QR Code" width="200" height="200"
           style="border:5px solid #c9a84c;border-radius:8px;display:inline-block;" />
      <p style="margin:10px 0 0;color:#666666;font-size:12px;">Present this QR code to your driver at pickup</p>
    </div>` : '';

  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;color:#ffffff;font-size:21px;font-weight:700;">Booking Confirmed!</h2>
    <p style="margin:0 0 24px;color:#aaaaaa;font-size:14px;line-height:1.7;">Your TRAQQ airport shuttle is booked and your payment has been confirmed. Here are your trip details:</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
           style="border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;">
      ${rows}
    </table>

    ${trackingButton(trackingUrl)}

    ${qrBlock}

    <div style="margin:32px 0 0;padding:18px 20px;background-color:#222222;border-radius:8px;border-left:4px solid #c9a84c;">
      <p style="margin:0;color:#aaaaaa;font-size:13px;line-height:1.75;">
        <strong style="color:#ffffff;">What happens next?</strong><br>
        A driver will be assigned to your booking closer to your pickup time.
        You'll receive an email when your driver is on the way.
        Use the tracking link above to follow your ride in real time.
      </p>
    </div>`);

  await transport.sendMail({
    from: fromAddress(),
    to: booking.email,
    subject: `Booking Confirmed – Ref ${booking.bookingRef} | TRAQQ`,
    html
  });

  console.log(`[email] Confirmation sent → ${booking.email} (${booking.bookingRef})`);
}

// ── 2. Trip Reminder ─────────────────────────────────────────────────────────

async function sendTripReminder(booking) {
  const transport = getTransport();
  if (!transport) {
    console.log('[email] Not configured — skipping trip reminder for', booking.bookingRef);
    return;
  }
  if (!booking.email) return;

  const base = getBaseUrl();
  const trackingUrl = `${base}/booking-tracking/${booking.bookingRef}`;

  const rows = [
    detailRow('Booking Reference', booking.bookingRef, true),
    detailRow('Pickup Date', formatDate(booking.pickupDate)),
    detailRow('Pickup Time', formatTime(booking.pickupTime)),
    detailRow('Pickup Address', booking.pickupAddress),
    booking.destinationAddress ? detailRow('Destination', booking.destinationAddress) : '',
    detailRow('Terminal', `Terminal ${booking.dropoffTerminal}`),
    detailRow('Passengers', String(booking.passengerCount))
  ].join('');

  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;color:#ffffff;font-size:21px;font-weight:700;">Trip Reminder</h2>
    <p style="margin:0 0 24px;color:#aaaaaa;font-size:14px;line-height:1.7;">Your TRAQQ airport shuttle is coming up in approximately 24 hours. Here's a summary of your trip:</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
           style="border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;">
      ${rows}
    </table>

    ${trackingButton(trackingUrl)}

    <div style="margin:28px 0 0;padding:18px 20px;background-color:#222222;border-radius:8px;border-left:4px solid #c9a84c;">
      <p style="margin:0;color:#aaaaaa;font-size:13px;line-height:1.8;">
        <strong style="color:#ffffff;">Checklist for tomorrow:</strong><br>
        &#10003;&nbsp; Be ready 10 minutes before your scheduled pickup time<br>
        &#10003;&nbsp; Have your luggage packed and ready at the door<br>
        &#10003;&nbsp; You'll receive a notification when your driver is on the way<br>
        &#10003;&nbsp; Use the tracking link above to monitor your driver's arrival
      </p>
    </div>`);

  await transport.sendMail({
    from: fromAddress(),
    to: booking.email,
    subject: `Reminder: Your TRAQQ ride is tomorrow – ${booking.bookingRef}`,
    html
  });

  console.log(`[email] Reminder sent → ${booking.email} (${booking.bookingRef})`);
}

// ── 3. Driver On The Way ─────────────────────────────────────────────────────

async function sendDriverOnTheWay(booking, driver) {
  const transport = getTransport();
  if (!transport) {
    console.log('[email] Not configured — skipping driver-on-the-way for', booking.bookingRef);
    return;
  }
  if (!booking.email) return;

  const base = getBaseUrl();
  const trackingUrl = `${base}/booking-tracking/${booking.bookingRef}`;

  const rows = [
    detailRow('Driver', driver.fullName),
    detailRow('Vehicle', `${driver.vehicleColor} ${driver.vehicleMake} ${driver.vehicleModel}`),
    detailRow('License Plate', driver.vehiclePlate, true),
    detailRow('Booking Ref', booking.bookingRef, true),
    detailRow('Pickup Address', booking.pickupAddress),
    detailRow('Pickup Time', formatTime(booking.pickupTime))
  ].join('');

  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;color:#ffffff;font-size:21px;font-weight:700;">Your Driver is On The Way!</h2>
    <p style="margin:0 0 24px;color:#aaaaaa;font-size:14px;line-height:1.7;">Great news — your TRAQQ driver is heading to your pickup location now.</p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
           style="border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;">
      ${rows}
    </table>

    ${trackingButton(trackingUrl, 'Track Your Driver →')}

    <div style="margin:28px 0 0;padding:18px 20px;background-color:#222222;border-radius:8px;border-left:4px solid #c9a84c;">
      <p style="margin:0;color:#aaaaaa;font-size:13px;line-height:1.7;">
        Please be ready at your pickup location. Your driver will notify you upon arrival.
        Look for the <strong style="color:#ffffff;">${driver.vehicleColor} ${driver.vehicleMake} ${driver.vehicleModel}</strong>
        with plate <strong style="color:#c9a84c;">${driver.vehiclePlate}</strong>.
      </p>
    </div>`);

  await transport.sendMail({
    from: fromAddress(),
    to: booking.email,
    subject: `Your driver is on the way – ${booking.bookingRef} | TRAQQ`,
    html
  });

  console.log(`[email] Driver-on-the-way sent → ${booking.email} (${booking.bookingRef})`);
}

// ── 4. Driver Arrived ────────────────────────────────────────────────────────

async function sendDriverArrived(booking, driver) {
  const transport = getTransport();
  if (!transport) {
    console.log('[email] Not configured — skipping driver-arrived for', booking.bookingRef);
    return;
  }
  if (!booking.email) return;

  const base = getBaseUrl();
  const trackingUrl = `${base}/booking-tracking/${booking.bookingRef}`;

  const rows = [
    detailRow('Driver', driver.fullName),
    detailRow('Vehicle', `${driver.vehicleColor} ${driver.vehicleMake} ${driver.vehicleModel}`),
    detailRow('License Plate', driver.vehiclePlate, true),
    detailRow('Pickup Address', booking.pickupAddress)
  ].join('');

  const html = emailWrapper(`
    <h2 style="margin:0 0 8px;color:#ffffff;font-size:21px;font-weight:700;">Your Driver Has Arrived!</h2>
    <p style="margin:0 0 24px;color:#aaaaaa;font-size:14px;line-height:1.7;">Your TRAQQ driver is at your pickup location and waiting for you.</p>

    <div style="text-align:center;padding:20px;background-color:#1a241a;border-radius:8px;border:1px solid #2d4a2d;margin:0 0 24px;">
      <p style="margin:0;color:#4ade80;font-size:18px;font-weight:bold;">Driver is outside — please head down now.</p>
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
           style="border:1px solid #2a2a2a;border-radius:8px;overflow:hidden;">
      ${rows}
    </table>

    ${trackingButton(trackingUrl, 'View Ride Details →')}

    <div style="margin:28px 0 0;padding:18px 20px;background-color:#222222;border-radius:8px;border-left:4px solid #4ade80;">
      <p style="margin:0;color:#aaaaaa;font-size:13px;line-height:1.7;">
        Look for the <strong style="color:#ffffff;">${driver.vehicleColor} ${driver.vehicleMake} ${driver.vehicleModel}</strong>
        with plate <strong style="color:#c9a84c;">${driver.vehiclePlate}</strong> at your pickup address.
        Have your luggage ready and present your QR code to the driver.
      </p>
    </div>`);

  await transport.sendMail({
    from: fromAddress(),
    to: booking.email,
    subject: `Driver arrived at your pickup – ${booking.bookingRef} | TRAQQ`,
    html
  });

  console.log(`[email] Driver-arrived sent → ${booking.email} (${booking.bookingRef})`);
}

module.exports = {
  sendBookingConfirmation,
  sendTripReminder,
  sendDriverOnTheWay,
  sendDriverArrived
};
