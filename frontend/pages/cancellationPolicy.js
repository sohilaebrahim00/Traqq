export default function cancellationPolicy(root) {
  root.innerHTML = `
    <div class="static-page">
      <div class="inner-hero">
        <div class="container">
          <p class="hero-eyebrow">Legal</p>
          <h1 class="inner-hero-title">Cancellation Policy</h1>
          <p class="inner-hero-sub">We want to be fair and transparent about how cancellations work.</p>
        </div>
      </div>

      <div class="container static-content">
        <div class="cancellation-summary">
          <div class="cancel-tier cancel-tier-green">
            <div class="cancel-tier-icon">✓</div>
            <div>
              <h3>Full Refund</h3>
              <p>Cancel <strong>24+ hours</strong> before your scheduled pickup.</p>
            </div>
          </div>
          <div class="cancel-tier cancel-tier-yellow">
            <div class="cancel-tier-icon">◑</div>
            <div>
              <h3>50% Refund</h3>
              <p>Cancel <strong>4–24 hours</strong> before your scheduled pickup.</p>
            </div>
          </div>
          <div class="cancel-tier cancel-tier-red">
            <div class="cancel-tier-icon">✕</div>
            <div>
              <h3>No Refund</h3>
              <p>Cancel <strong>less than 4 hours</strong> before your scheduled pickup.</p>
            </div>
          </div>
        </div>

        <div class="legal-doc" style="margin-top:2.5rem;">
          <section class="legal-section">
            <h2>How to Cancel</h2>
            <p>To cancel a booking, contact us through our <a data-link="/contact" href="/contact" style="color:var(--gold);">Contact page</a> or email bookings@traqq.com. Include your Booking ID in your message.</p>
          </section>

          <section class="legal-section">
            <h2>Refund Processing</h2>
            <p>Approved refunds are issued to the original payment method within 5–10 business days, depending on your card issuer.</p>
          </section>

          <section class="legal-section">
            <h2>Flight Delays</h2>
            <p>If your flight is delayed by the airline and you need to reschedule your pickup, contact us immediately. We will not charge a cancellation fee for flight-delay reschedules, provided you notify us before your scheduled pickup time.</p>
          </section>

          <section class="legal-section">
            <h2>Driver No-Shows</h2>
            <p>In the unlikely event that your driver does not arrive within 15 minutes of your scheduled pickup, you are entitled to a full refund. Contact us immediately if this happens.</p>
          </section>

          <section class="legal-section">
            <h2>Weather and Force Majeure</h2>
            <p>In cases of severe weather, road closures, or other events beyond our control, TRAQQ will offer a full reschedule at no charge or a full refund. We will contact affected customers as soon as possible.</p>
          </section>

          <section class="legal-section">
            <h2>Rescheduling</h2>
            <p>You may reschedule a booking at no charge if you notify us at least 4 hours before your original pickup time and a suitable driver is available for the new time.</p>
          </section>
        </div>

        <div class="about-cta">
          <h2>Questions about your booking?</h2>
          <a class="btn btn-primary" data-link="/contact" href="/contact">Contact Support</a>
          <a class="btn btn-ghost" data-link="/faq" href="/faq" style="margin-left:0.75rem;">Read FAQ</a>
        </div>
      </div>
    </div>`;
}
