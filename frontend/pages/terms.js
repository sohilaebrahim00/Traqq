export default function terms(root) {
  root.innerHTML = `
    <div class="static-page">
      <div class="inner-hero">
        <div class="container">
          <p class="hero-eyebrow">Legal</p>
          <h1 class="inner-hero-title">Terms of Service</h1>
          <p class="inner-hero-sub">Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
      </div>

      <div class="container static-content">
        <div class="legal-doc">
          <section class="legal-section">
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing or using the TRAQQ platform (the "Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. TRAQQ reserves the right to modify these terms at any time with notice provided on this page.</p>
          </section>

          <section class="legal-section">
            <h2>2. Service Description</h2>
            <p>TRAQQ provides private door-to-door airport shuttle transportation to and from Dallas/Fort Worth International Airport (DFW). The Service operates at a flat rate of $99 per trip for up to 6 passengers. TRAQQ is not affiliated with DFW Airport or the City of Dallas.</p>
          </section>

          <section class="legal-section">
            <h2>3. Bookings and Payment</h2>
            <p>All bookings must be completed through the TRAQQ platform. Payment is due at the time of booking. We accept all major credit cards through our payment processor, Stripe. Your booking is not confirmed until full payment is received and a confirmation is issued.</p>
            <p>The flat rate of $99 covers transportation for up to 6 passengers. No additional fees are charged for luggage, fuel, or tolls.</p>
          </section>

          <section class="legal-section">
            <h2>4. Cancellations and Refunds</h2>
            <p>See our <a data-link="/cancellation-policy" href="/cancellation-policy" style="color:var(--gold);">Cancellation Policy</a> for complete information on cancellations, rescheduling, and refunds.</p>
          </section>

          <section class="legal-section">
            <h2>5. Passenger Responsibilities</h2>
            <p>Passengers must be ready at the pickup address at the scheduled time. Late passengers may result in the driver departing to avoid jeopardizing other commitments. TRAQQ is not responsible for missed flights due to passenger tardiness.</p>
            <p>Passengers are responsible for providing an accurate pickup address and terminal selection. TRAQQ is not liable for delays caused by incorrect booking information.</p>
          </section>

          <section class="legal-section">
            <h2>6. Limitation of Liability</h2>
            <p>To the maximum extent permitted by applicable law, TRAQQ shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including missed flights, loss of baggage, or delays caused by traffic, weather, or other circumstances beyond our control.</p>
          </section>

          <section class="legal-section">
            <h2>7. Privacy</h2>
            <p>Your use of the Service is also governed by our <a data-link="/privacy" href="/privacy" style="color:var(--gold);">Privacy Policy</a>, which is incorporated into these Terms by reference.</p>
          </section>

          <section class="legal-section">
            <h2>8. Governing Law</h2>
            <p>These Terms shall be governed by the laws of the State of Texas, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of Dallas County, Texas.</p>
          </section>

          <section class="legal-section">
            <h2>9. Contact</h2>
            <p>Questions about these Terms may be directed to legal@traqq.com or through our <a data-link="/contact" href="/contact" style="color:var(--gold);">Contact page</a>.</p>
          </section>
        </div>
      </div>
    </div>`;
}
