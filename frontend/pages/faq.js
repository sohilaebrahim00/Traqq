const FAQS = [
  {
    q: 'What is TRAQQ?',
    a: 'TRAQQ is a premium private airport shuttle booking platform for door-to-door transportation to or from DFW Airport. Book online in minutes, pay securely, and receive a QR confirmation for your ride.'
  },
  {
    q: 'What airport does TRAQQ serve?',
    a: 'TRAQQ currently serves Dallas Fort Worth International Airport, including Terminals A, B, C, D, and E. Your driver will take you directly to the terminal you select during booking.'
  },
  {
    q: 'Is the price really $99?',
    a: 'Yes. TRAQQ offers a flat $99 rate for eligible private airport shuttle bookings — for the entire vehicle, not per person. No surge pricing, no hidden fees, no tips required. What you see at booking is exactly what you pay.'
  },
  {
    q: 'How many passengers can ride?',
    a: 'Each booking allows up to 6 passengers. Whether it\'s just you, your family, or a small business group — everyone travels together in one private vehicle for the same $99.'
  },
  {
    q: 'Can I book pickup or drop-off?',
    a: 'Yes. TRAQQ supports both airport pickup (DFW → your location) and airport drop-off (your location → DFW) service depending on your trip needs. Select your direction when booking.'
  },
  {
    q: 'What details do I need to book?',
    a: 'You\'ll need your pickup date, pickup time (half-hour slots only), pickup address, passenger count, carry-on and checked luggage details, preferred terminal, and a phone number. An email is optional.'
  },
  {
    q: 'What happens after payment?',
    a: 'After successful payment, your booking is confirmed and a QR code is generated for your ride. You can view your QR code on the confirmation page and look up your booking anytime using your Booking ID.'
  },
  {
    q: 'How do I receive my QR code?',
    a: 'Your QR code appears on the success page immediately after payment is confirmed. Screenshot or save it — your driver will scan it at pickup as your ride confirmation.'
  },
  {
    q: 'Can I change or cancel my booking?',
    a: 'Cancellations made 24 hours or more before your scheduled pickup are eligible for a full refund. Changes depend on driver availability. Please see our Cancellation Policy or contact TRAQQ support for assistance.'
  },
  {
    q: 'What if my flight time changes?',
    a: 'If your flight time changes, contact support as soon as possible so your booking details can be reviewed and adjusted. We understand travel disruptions happen and we\'ll work with you to find a solution.'
  },
  {
    q: 'Is payment secure?',
    a: 'Yes. All payments are processed through Stripe using industry-standard secure payment infrastructure. Your card details are never stored on TRAQQ servers — Stripe handles all payment data with PCI-compliant security.'
  },
  {
    q: 'How do I contact support?',
    a: 'You can reach TRAQQ through the Contact page at /contact, by phone at +1 (000) 000-0000, or by email at support@traqq.com. Our support team is available daily 6 AM – 10 PM CT.'
  },
];

export default function faq(root) {
  root.innerHTML = `
    <div class="static-page">
      <div class="inner-hero">
        <div class="container">
          <p class="hero-eyebrow">Got Questions?</p>
          <h1 class="inner-hero-title">Frequently Asked Questions</h1>
          <p class="inner-hero-sub">Everything you need to know before booking your TRAQQ airport shuttle.</p>
        </div>
      </div>

      <div class="container static-content">
        <div class="faq-flat-list" id="faqList">
          ${FAQS.map((item, i) => `
            <div class="faq-flat-item reveal-up${i === 0 ? ' open' : ''}" data-idx="${i}">
              <button class="faq-btn" aria-expanded="${i === 0}">
                <span>${item.q}</span>
                <span class="faq-btn-icon"><i data-lucide="plus" class="icon-sm"></i></span>
              </button>
              <div class="faq-flat-body">${item.a}</div>
            </div>`).join('')}
        </div>

        <div class="about-cta reveal-scale" style="margin-top:3rem;">
          <h2>Still have questions?</h2>
          <p>Our support team reads every message and responds within a few hours.</p>
          <a class="btn btn-primary btn-lg" data-link="/contact" href="/contact">Contact Us</a>
        </div>
      </div>
    </div>`;

  root.querySelectorAll('.faq-flat-item').forEach(item => {
    const btn = item.querySelector('.faq-btn');
    const icon = item.querySelector('.faq-btn-icon');

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all
      root.querySelectorAll('.faq-flat-item').forEach(el => {
        el.classList.remove('open');
        el.querySelector('.faq-btn').setAttribute('aria-expanded', 'false');
      });

      // Open clicked (unless it was already open)
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}
