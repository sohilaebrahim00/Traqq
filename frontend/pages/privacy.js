export default function privacy(root) {
  root.innerHTML = `
    <div class="static-page">
      <div class="inner-hero">
        <div class="container">
          <p class="hero-eyebrow">Legal</p>
          <h1 class="inner-hero-title">Privacy Policy</h1>
          <p class="inner-hero-sub">Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </div>

      <div class="container static-content">
        <div class="legal-doc">
          <section class="legal-section">
            <h2>1. Information We Collect</h2>
            <p>When you use TRAQQ, we collect the following information:</p>
            <ul class="legal-list">
              <li><strong>Booking information:</strong> Pickup address, pickup date and time, terminal, passenger count, and luggage details.</li>
              <li><strong>Contact information:</strong> Phone number and optionally your email address.</li>
              <li><strong>Account information:</strong> Full name, phone number, email address, and hashed password (if you create an account).</li>
              <li><strong>Payment information:</strong> Processed entirely by Stripe. TRAQQ does not store your card number, expiry, or CVV.</li>
            </ul>
          </section>

          <section class="legal-section">
            <h2>2. How We Use Your Information</h2>
            <ul class="legal-list">
              <li>To fulfill your shuttle booking and communicate trip details.</li>
              <li>To generate your booking confirmation and QR code.</li>
              <li>To send booking-related communications (confirmation, reminders).</li>
              <li>To improve our service and resolve disputes.</li>
            </ul>
            <p>We do not sell your personal data to third parties. We do not use your information for advertising purposes.</p>
          </section>

          <section class="legal-section">
            <h2>3. Payment Processing</h2>
            <p>All payments are processed by <strong>Stripe</strong>. When you pay, your card data goes directly to Stripe and is governed by Stripe's Privacy Policy. TRAQQ only receives a payment confirmation and a transaction reference — never your raw card details.</p>
          </section>

          <section class="legal-section">
            <h2>4. Data Retention</h2>
            <p>Booking records are retained for 3 years for business and legal compliance purposes. Account information is retained until you request deletion. Contact legal@traqq.com to request deletion of your data.</p>
          </section>

          <section class="legal-section">
            <h2>5. Cookies and Local Storage</h2>
            <p>TRAQQ uses your browser's local storage to remember your authentication session and recent bookings. We do not use tracking cookies or third-party analytics beyond what is strictly necessary to operate the service.</p>
          </section>

          <section class="legal-section">
            <h2>6. Your Rights</h2>
            <p>You have the right to access, correct, or delete your personal data at any time. Contact us at legal@traqq.com or through our <a data-link="/contact" href="/contact" style="color:var(--gold);">Contact page</a>.</p>
          </section>

          <section class="legal-section">
            <h2>7. Security</h2>
            <p>We use industry-standard security practices including HTTPS encryption, hashed passwords (bcrypt), and short-lived JWT tokens. While no system is 100% secure, we take reasonable measures to protect your information.</p>
          </section>

          <section class="legal-section">
            <h2>8. Contact</h2>
            <p>Privacy questions may be directed to legal@traqq.com.</p>
          </section>
        </div>
      </div>
    </div>`;
}
