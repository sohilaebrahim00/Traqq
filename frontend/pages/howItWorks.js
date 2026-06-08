export default function howItWorks(root) {
  const steps = [
    {
      n: '01',
      title: 'Select Your Ride Details',
      desc: 'Choose your pickup date, pickup time (half-hour slots), pickup address, passenger count, luggage, and preferred DFW terminal. Booking takes under 2 minutes.',
      icon: '<i data-lucide="clipboard-list" class="icon-md"></i>'
    },
    {
      n: '02',
      title: 'Review Your Booking',
      desc: 'Confirm all your trip details before heading to checkout. Make sure the date, time, terminal, and passenger count are correct.',
      icon: '<i data-lucide="check-circle" class="icon-md"></i>'
    },
    {
      n: '03',
      title: 'Pay Securely',
      desc: 'Complete your $99 flat-rate payment through our Stripe-powered checkout. Your card details are handled by Stripe and never stored on our servers.',
      icon: '<i data-lucide="lock" class="icon-md"></i>'
    },
    {
      n: '04',
      title: 'Receive Confirmation',
      desc: 'After payment is confirmed, your booking status updates to CONFIRMED and a unique QR code is generated for your ride.',
      icon: '<i data-lucide="qr-code" class="icon-md"></i>'
    },
    {
      n: '05',
      title: 'Ride Smoothly',
      desc: 'Your private driver arrives at your pickup address at the scheduled time and takes you directly to your DFW terminal — door to terminal, zero hassle.',
      icon: '<i data-lucide="plane" class="icon-md"></i>'
    },
  ];

  root.innerHTML = `
    <div class="static-page">
      <div class="inner-hero">
        <div class="container">
          <p class="hero-eyebrow">Simple Process</p>
          <h1 class="inner-hero-title">How TRAQQ Works</h1>
          <p class="inner-hero-sub">A simple premium booking experience from start to finish.</p>
        </div>
      </div>

      <div class="container static-content">
        <div class="steps-list">
          ${steps.map((s, idx) => `
            <div class="step-item reveal-left${idx ? ` reveal-delay-${Math.min(idx, 4)}` : ''}">
              <div class="step-number-col">
                <div class="step-number">${s.n}</div>
                <div class="step-line"></div>
              </div>
              <div class="step-body-col">
                <div class="step-icon-circle">${s.icon}</div>
                <div>
                  <h3 class="step-item-title">${s.title}</h3>
                  <p class="step-item-desc">${s.desc}</p>
                </div>
              </div>
            </div>`).join('')}
        </div>

        <div class="why-grid" style="margin-bottom:3rem;">
          <div class="why-item reveal-up">
            <div class="why-icon"><i data-lucide="banknote" class="icon-md"></i></div>
            <div>
              <h4>Always $99</h4>
              <p>One transparent flat rate for the entire shuttle — no per-person fees, no surge pricing.</p>
            </div>
          </div>
          <div class="why-item reveal-up reveal-delay-1">
            <div class="why-icon"><i data-lucide="users" class="icon-md"></i></div>
            <div>
              <h4>Up to 6 Passengers</h4>
              <p>Bring the whole group for the same price. Split it and it's outstanding value.</p>
            </div>
          </div>
          <div class="why-item reveal-up reveal-delay-2">
            <div class="why-icon"><i data-lucide="plane" class="icon-md"></i></div>
            <div>
              <h4>All DFW Terminals</h4>
              <p>Terminals A, B, C, D, and E — your driver goes directly to your terminal.</p>
            </div>
          </div>
          <div class="why-item reveal-up reveal-delay-3">
            <div class="why-icon"><i data-lucide="smartphone" class="icon-md"></i></div>
            <div>
              <h4>No App Required</h4>
              <p>Book from any browser, no account needed. Guests can book with just a phone number.</p>
            </div>
          </div>
        </div>

        <div class="about-cta reveal-scale">
          <h2>That's all there is to it.</h2>
          <p>Book your private DFW shuttle now and travel with confidence.</p>
          <a class="btn btn-primary btn-lg" data-link="/booking" href="/booking">Book Your Ride — $99</a>
        </div>
      </div>
    </div>`;
}
