export default function about(root) {
  root.innerHTML = `
    <div class="static-page">
      <div class="inner-hero">
        <div class="container">
          <p class="hero-eyebrow">Our Story</p>
          <h1 class="inner-hero-title">About TRAQQ</h1>
          <p class="inner-hero-sub">Premium private airport transportation built for modern travelers.</p>
        </div>
      </div>

      <div class="container static-content">

        <div class="about-mission reveal-left">
          <div class="about-mission-text">
            <h2>Our Mission</h2>
            <p>To make private airport transportation easier, clearer, and more dependable. TRAQQ was designed to make airport shuttle booking simple, reliable, and professional — with a smooth door-to-door experience for DFW travelers at transparent pricing.</p>
            <p>No surge pricing. No strangers sharing your ride. No guessing what you'll pay. One flat rate of <strong class="text-gold">$99</strong> for up to 6 passengers, every time.</p>
          </div>
          <div class="about-badge-large">
            <span class="badge-price">$99</span>
            <span class="badge-label">Always</span>
          </div>
        </div>

        <div class="about-values" style="margin-bottom:3rem;">
          <h2>What We Offer</h2>
          <div class="values-grid">
            <div class="value-card reveal-up">
              <div class="value-icon"><i data-lucide="car" class="icon-md"></i></div>
              <h3>Private Shuttle Bookings</h3>
              <p>Your group, your vehicle. No shared rides, no strangers, no unexpected stops.</p>
            </div>
            <div class="value-card reveal-up reveal-delay-1">
              <div class="value-icon"><i data-lucide="banknote" class="icon-md"></i></div>
              <h3>Flat $99 Pricing</h3>
              <p>One transparent price for the entire shuttle. No hidden fees, no tips required.</p>
            </div>
            <div class="value-card reveal-up reveal-delay-2">
              <div class="value-icon"><i data-lucide="door-open" class="icon-md"></i></div>
              <h3>Door-to-Door Service</h3>
              <p>Picked up at your front door, dropped at your DFW terminal — that's the full service.</p>
            </div>
            <div class="value-card reveal-up reveal-delay-3">
              <div class="value-icon"><i data-lucide="users" class="icon-md"></i></div>
              <h3>Up to 6 Passengers</h3>
              <p>Travel with your whole group for the same $99. Perfect for families and business teams.</p>
            </div>
            <div class="value-card reveal-up reveal-delay-2">
              <div class="value-icon"><i data-lucide="lock" class="icon-md"></i></div>
              <h3>Secure Online Payment</h3>
              <p>Stripe-powered checkout with industry-standard security. Your card is never stored.</p>
            </div>
            <div class="value-card reveal-up reveal-delay-3">
              <div class="value-icon"><i data-lucide="qr-code" class="icon-md"></i></div>
              <h3>QR-Based Confirmation</h3>
              <p>A unique QR code generated instantly after payment — your digital boarding pass.</p>
            </div>
          </div>
        </div>

        <div class="about-values">
          <h2>Our Brand Values</h2>
          <div class="values-grid">
            <div class="value-card reveal-up">
              <div class="value-icon"><i data-lucide="clock" class="icon-md"></i></div>
              <h3>Professionalism</h3>
              <p>Every interaction, every ride — held to a standard worthy of your time and trust.</p>
            </div>
            <div class="value-card reveal-up reveal-delay-1">
              <div class="value-icon"><i data-lucide="shield-check" class="icon-md"></i></div>
              <h3>Reliability</h3>
              <p>Your driver is there when we say they will be. Your flight can't wait — neither can we.</p>
            </div>
            <div class="value-card reveal-up reveal-delay-2">
              <div class="value-icon"><i data-lucide="clipboard-list" class="icon-md"></i></div>
              <h3>Transparency</h3>
              <p>The price you see is the price you pay. Always. No fine print, no surprises.</p>
            </div>
            <div class="value-card reveal-up reveal-delay-3">
              <div class="value-icon"><i data-lucide="armchair" class="icon-md"></i></div>
              <h3>Comfort</h3>
              <p>Clean, spacious vehicles with room for passengers and luggage — never cramped.</p>
            </div>
            <div class="value-card reveal-up reveal-delay-2">
              <div class="value-icon"><i data-lucide="shield" class="icon-md"></i></div>
              <h3>Safety</h3>
              <p>Professional drivers, safe vehicles, and secure payment. Your safety is non-negotiable.</p>
            </div>
            <div class="value-card reveal-up reveal-delay-3">
              <div class="value-icon"><i data-lucide="star" class="icon-md"></i></div>
              <h3>Premium Service</h3>
              <p>Airport transportation that feels like it belongs in the same category as your flight.</p>
            </div>
          </div>
        </div>

        <div class="about-cta reveal-scale">
          <h2>Ready to ride?</h2>
          <p>Book your DFW shuttle in under 2 minutes. Flat rate, no surprises.</p>
          <a class="btn btn-primary btn-lg" data-link="/booking" href="/booking">Book Now — $99</a>
        </div>
      </div>
    </div>`;
}
