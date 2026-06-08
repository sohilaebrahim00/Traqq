export default function home(root) {
  root.innerHTML = `
    <!-- ── HERO ── -->
    <section class="hero-v2">
      <div class="hero-v2-bg"></div>
      <div class="hero-v2-overlay"></div>
      <div class="hero-v2-inner container">
        <div class="hero-v2-text">
          <p class="hero-eyebrow">Premium Airport Transportation</p>
          <h1 class="hero-headline gradient-heading" data-typewriter>Door-to-Door<br/>DFW Shuttle</h1>
          <p class="hero-sub">Private airport transportation for up to 6 passengers. Flat $99 rate. Smooth service to or from DFW Airport.</p>
          <div class="hero-actions">
            <a class="btn btn-primary btn-lg" data-link="/booking" href="/booking">Book Your Ride</a>
            <a class="btn btn-ghost btn-lg" data-link="/how-it-works" href="/how-it-works">How It Works</a>
          </div>
        </div>
      </div>
    </section>

    <!-- ── TRUST MARQUEE ── -->
    <div class="trust-marquee reveal" aria-hidden="true">
      <div class="trust-marquee-track">
        <div class="trust-marquee-group">
          <span class="trust-marquee-item"><i data-lucide="tag" class="icon-xs"></i> Flat $99 Rate</span>
          <span class="trust-marquee-item"><i data-lucide="car" class="icon-xs"></i> Private Shuttle</span>
          <span class="trust-marquee-item"><i data-lucide="users" class="icon-xs"></i> Up to 6 Passengers</span>
          <span class="trust-marquee-item"><i data-lucide="plane" class="icon-xs"></i> DFW Airport Service</span>
          <span class="trust-marquee-item"><i data-lucide="shield-check" class="icon-xs"></i> Secure Checkout</span>
          <span class="trust-marquee-item"><i data-lucide="check-circle" class="icon-xs"></i> No Hidden Fees</span>
        </div>
        <div class="trust-marquee-group" aria-hidden="true">
          <span class="trust-marquee-item"><i data-lucide="tag" class="icon-xs"></i> Flat $99 Rate</span>
          <span class="trust-marquee-item"><i data-lucide="car" class="icon-xs"></i> Private Shuttle</span>
          <span class="trust-marquee-item"><i data-lucide="users" class="icon-xs"></i> Up to 6 Passengers</span>
          <span class="trust-marquee-item"><i data-lucide="plane" class="icon-xs"></i> DFW Airport Service</span>
          <span class="trust-marquee-item"><i data-lucide="shield-check" class="icon-xs"></i> Secure Checkout</span>
          <span class="trust-marquee-item"><i data-lucide="check-circle" class="icon-xs"></i> No Hidden Fees</span>
        </div>
      </div>
    </div>

    <!-- ── SERVICE HIGHLIGHTS ── -->
    <section class="home-section">
      <div class="container">
        <p class="section-tag">Our Services</p>
        <h2 class="section-title">Private Airport Transportation,<br/>Designed Around You</h2>
        <div class="service-cards-grid">
          <div class="service-card reveal">
            <div class="service-card-icon"><i data-lucide="door-open" class="icon-lg"></i></div>
            <h3>Door-to-Door Pickup</h3>
            <p>Get picked up from your exact location and ride directly to DFW Airport with no shared stops, no detours, and no delays.</p>
          </div>
          <div class="service-card reveal reveal-delay-1">
            <div class="service-card-icon"><i data-lucide="banknote" class="icon-lg"></i></div>
            <h3>Flat $99 Rate</h3>
            <p>Simple transparent pricing. No hidden fees, no surge pricing, no surprises. What you see at booking is exactly what you pay.</p>
          </div>
          <div class="service-card reveal reveal-delay-2">
            <div class="service-card-icon"><i data-lucide="users" class="icon-lg"></i></div>
            <h3>Up to 6 Passengers</h3>
            <p>Perfect for families, business travelers, small groups, and airport transfers — all in one private, comfortable ride.</p>
          </div>
          <div class="service-card reveal reveal-delay-3">
            <div class="service-card-icon"><i data-lucide="qr-code" class="icon-lg"></i></div>
            <h3>QR Confirmation</h3>
            <p>Receive a confirmed booking with a unique QR code after successful payment — your digital boarding pass for the shuttle.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── BOOK YOUR RIDE IN MINUTES ── -->
    <section class="brim-section home-section-alt">
      <div class="brim-bg-glow" aria-hidden="true"></div>
      <div class="container brim-grid">

        <div class="brim-content">
          <p class="section-tag">Simple Process</p>
          <h2 class="section-title gradient-heading">Book Your Ride<br/>in Minutes</h2>
          <p class="brim-subtitle">A streamlined airport shuttle experience designed for comfort, clarity, and confidence — from booking to confirmation.</p>

          <ol class="brim-timeline" aria-label="Booking steps">
            <li class="brim-step">
              <span class="brim-step-num" aria-hidden="true">01</span>
              <span class="brim-step-ico" aria-hidden="true"><i data-lucide="calendar" class="icon-sm"></i></span>
              <div class="brim-step-body">
                <h4 class="brim-step-title">Select Your Schedule</h4>
                <p class="brim-step-desc">Choose your pickup date and time with clear real-time availability.</p>
              </div>
            </li>
            <li class="brim-step">
              <span class="brim-step-num" aria-hidden="true">02</span>
              <span class="brim-step-ico" aria-hidden="true"><i data-lucide="map-pin" class="icon-sm"></i></span>
              <div class="brim-step-body">
                <h4 class="brim-step-title">Add Trip Details</h4>
                <p class="brim-step-desc">Enter your pickup address, passenger count, luggage, and DFW terminal.</p>
              </div>
            </li>
            <li class="brim-step">
              <span class="brim-step-num" aria-hidden="true">03</span>
              <span class="brim-step-ico" aria-hidden="true"><i data-lucide="receipt" class="icon-sm"></i></span>
              <div class="brim-step-body">
                <h4 class="brim-step-title">Review Flat Rate</h4>
                <p class="brim-step-desc">Confirm your private shuttle details with a transparent $99 flat rate.</p>
              </div>
            </li>
            <li class="brim-step">
              <span class="brim-step-num" aria-hidden="true">04</span>
              <span class="brim-step-ico" aria-hidden="true"><i data-lucide="credit-card" class="icon-sm"></i></span>
              <div class="brim-step-body">
                <h4 class="brim-step-title">Pay Securely</h4>
                <p class="brim-step-desc">Complete checkout using secure Stripe payment processing.</p>
              </div>
            </li>
            <li class="brim-step">
              <span class="brim-step-num" aria-hidden="true">05</span>
              <span class="brim-step-ico" aria-hidden="true"><i data-lucide="qr-code" class="icon-sm"></i></span>
              <div class="brim-step-body">
                <h4 class="brim-step-title">Receive Confirmation</h4>
                <p class="brim-step-desc">Get your confirmed booking details and QR code after payment.</p>
              </div>
            </li>
          </ol>

          <div class="brim-cta">
            <a class="btn btn-primary brim-btn" data-link="/booking" href="/booking">Book Now — $99</a>
            <p class="brim-cta-sub">Private DFW shuttle service for up to 6 passengers.</p>
          </div>
        </div>

        <div class="brim-visual">
          <div class="brim-visual-halo" aria-hidden="true"></div>
          <figure class="brim-card">
            <figcaption class="brim-card-badge">
              <i data-lucide="star" class="icon-xs" aria-hidden="true"></i>
              Premium Booking Experience
            </figcaption>
            <img src="/assets/images/book.png"
                 alt="Book your premium DFW airport shuttle"
                 class="brim-card-img" />
          </figure>
          <div class="brim-trust-row" aria-label="Service guarantees">
            <div class="brim-trust-item">
              <i data-lucide="tag" class="icon-xs brim-trust-ico" aria-hidden="true"></i>
              <span>Flat $99 Rate</span>
            </div>
            <div class="brim-trust-item">
              <i data-lucide="shield-check" class="icon-xs brim-trust-ico" aria-hidden="true"></i>
              <span>Secure Checkout</span>
            </div>
            <div class="brim-trust-item">
              <i data-lucide="qr-code" class="icon-xs brim-trust-ico" aria-hidden="true"></i>
              <span>QR Confirmation</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── WHY TRAQQ ── -->
    <section class="home-section">
      <div class="container">
        <p class="section-tag">Why TRAQQ</p>
        <h2 class="section-title gradient-heading">Why Travelers Choose TRAQQ</h2>
        <div class="why-grid">
          <div class="why-item reveal">
            <div class="why-icon"><i data-lucide="star" class="icon-md"></i></div>
            <div>
              <h4>Private, Premium Experience</h4>
              <p>Your group only. No shared rides, no strangers, no unexpected stops.</p>
            </div>
          </div>
          <div class="why-item reveal reveal-delay-1">
            <div class="why-icon"><i data-lucide="shield-check" class="icon-md"></i></div>
            <div>
              <h4>Professional Airport Service</h4>
              <p>Courteous, punctual drivers who know DFW Airport inside and out.</p>
            </div>
          </div>
          <div class="why-item reveal reveal-delay-2">
            <div class="why-icon"><i data-lucide="smartphone" class="icon-md"></i></div>
            <div>
              <h4>Smooth Online Booking</h4>
              <p>Book in under 2 minutes — no app download, no account required for guests.</p>
            </div>
          </div>
          <div class="why-item reveal reveal-delay-1">
            <div class="why-icon"><i data-lucide="lock" class="icon-md"></i></div>
            <div>
              <h4>Secure Stripe Payments</h4>
              <p>Industry-standard payment processing. Your card data is never stored on our servers.</p>
            </div>
          </div>
          <div class="why-item reveal reveal-delay-2">
            <div class="why-icon"><i data-lucide="clipboard-check" class="icon-md"></i></div>
            <div>
              <h4>Clear Confirmation Flow</h4>
              <p>QR code issued immediately after payment. No waiting, no confusion.</p>
            </div>
          </div>
          <div class="why-item reveal reveal-delay-3">
            <div class="why-icon"><i data-lucide="plane" class="icon-md"></i></div>
            <div>
              <h4>Built for DFW Travelers</h4>
              <p>Specialized service covering all five DFW terminals — A, B, C, D, and E.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── DFW TERMINALS ── -->
    <section class="home-section home-section-alt terminals-section reveal">
      <div class="container">
        <p class="section-tag">Coverage</p>
        <h2 class="section-title gradient-heading">Serving Dallas Fort Worth<br/>International Airport</h2>
        <p class="section-sub">TRAQQ provides private door-to-door airport shuttle service for all DFW Airport terminals. Select your terminal during booking and your driver will take you directly there.</p>
        <div class="terminal-tags">
          <div class="terminal-tag"><span class="terminal-dot"></span>Terminal A</div>
          <div class="terminal-tag"><span class="terminal-dot"></span>Terminal B</div>
          <div class="terminal-tag"><span class="terminal-dot"></span>Terminal C</div>
          <div class="terminal-tag"><span class="terminal-dot"></span>Terminal D</div>
          <div class="terminal-tag"><span class="terminal-dot"></span>Terminal E</div>
        </div>
      </div>
    </section>

    <!-- ── FAQ PREVIEW ── -->
    <section class="home-section">
      <div class="container">
        <p class="section-tag">Common Questions</p>
        <h2 class="section-title">Quick Answers</h2>
        <div class="faq-preview-list">
          <div class="faq-preview-item reveal">
            <span class="faq-num">01</span>
            <div>
              <p class="faq-preview-q">Is the $99 price per person?</p>
              <p class="faq-preview-a">No. $99 is the flat rate for the entire shuttle for up to 6 passengers. Split it with your group and it's exceptional value.</p>
            </div>
          </div>
          <div class="faq-preview-item reveal reveal-delay-1">
            <span class="faq-num">02</span>
            <div>
              <p class="faq-preview-q">Do I need an account to book?</p>
              <p class="faq-preview-a">No account required. You can book as a guest using just your phone number. Creating an account lets you view your booking history.</p>
            </div>
          </div>
          <div class="faq-preview-item reveal reveal-delay-2">
            <span class="faq-num">03</span>
            <div>
              <p class="faq-preview-q">What happens after I pay?</p>
              <p class="faq-preview-a">Your booking is instantly confirmed and a unique QR code is generated for your ride — show it to your driver at pickup.</p>
            </div>
          </div>
        </div>
        <a class="btn btn-ghost" data-link="/faq" href="/faq">View All FAQs →</a>
      </div>
    </section>

    <!-- ── FINAL CTA ── -->
    <section class="final-cta reveal">
      <h2>Ready for a smoother airport ride?</h2>
      <p>Book your private DFW shuttle today for one flat rate — no surprises, no sharing.</p>
      <div class="final-cta-actions">
        <a class="btn btn-primary btn-lg" data-link="/booking" href="/booking">Book Now — $99</a>
        <a class="btn btn-ghost btn-lg" data-link="/contact" href="/contact">Contact Us</a>
      </div>
    </section>
  `;

  let brimObs = null;
  let cancelTypewriter = null;

  // ── Brim section stagger ──
  const brimSection = root.querySelector('.brim-section');
  if (brimSection && 'IntersectionObserver' in window) {
    brimObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.querySelectorAll('.brim-step').forEach((step, i) => {
          setTimeout(() => step.classList.add('brim-in'), i * 110);
        });
        const visual = entry.target.querySelector('.brim-visual');
        if (visual) setTimeout(() => visual.classList.add('brim-in'), 180);
        brimObs.disconnect();
      });
    }, { threshold: 0.12 });
    brimObs.observe(brimSection);
  }

  // ── Typewriter ──
  cancelTypewriter = initTypewriter(root);

  return () => {
    if (brimObs) brimObs.disconnect();
    if (cancelTypewriter) cancelTypewriter();
  };
}

function initTypewriter(root) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const headline = root.querySelector('.hero-headline[data-typewriter]');
  if (!headline || prefersReduced) return null;

  // Parse current innerHTML to extract characters and <br> positions
  const segments = headline.innerHTML.split(/<br\s*\/?>/i);
  const chars = [];
  segments.forEach((seg, idx) => {
    [...seg.replace(/<[^>]+>/g, '')].forEach(ch => chars.push({ ch }));
    if (idx < segments.length - 1) chars.push({ br: true });
  });

  // Clear headline immediately (before page fade-in) so there is no flash
  headline.innerHTML = '';
  const cursor = document.createElement('span');
  cursor.className = 'hero-typewriter-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  headline.appendChild(cursor);

  let cancelled = false;
  let i = 0;
  let timer = null;

  function typeNext() {
    if (cancelled) return;
    if (i >= chars.length) {
      cursor.classList.add('done');
      timer = setTimeout(() => {
        if (!cancelled && cursor.parentNode) cursor.remove();
      }, 3000);
      return;
    }
    const item = chars[i++];
    if (item.br) {
      cursor.before(document.createElement('br'));
    } else {
      cursor.insertAdjacentText('beforebegin', item.ch);
    }
    timer = setTimeout(typeNext, item.br ? 110 : 52 + Math.random() * 30);
  }

  // Begin during the page fade-in so user watches it type as page reveals
  timer = setTimeout(typeNext, 90);

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}

