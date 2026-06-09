import { showToast } from '../utils/auth.js';

const SLIDER_IMAGES = [
  { src: '/assets/images/contact-us-1.png', alt: 'TRAQQ professional shuttle service' },
  { src: '/assets/images/contact-us-2.png', alt: 'DFW airport transportation' },
  { src: '/assets/images/contact-us-3.png', alt: 'Private door-to-door shuttle' },
  { src: '/assets/images/contact-us-4.png', alt: 'Premium travel experience' },
];

export default function contact(root) {
  root.innerHTML = `
    <div class="static-page">
      <div class="inner-hero">
        <div class="container">
          <p class="hero-eyebrow">Get in Touch</p>
          <h1 class="inner-hero-title">Contact TRAQQ</h1>
          <p class="inner-hero-sub">Need help with your airport ride? Our support team is here to make your trip smooth from booking to drop-off.</p>
        </div>
      </div>

      <div class="container contact-page-wrap">
        <div class="contact-page-grid">

          <!-- LEFT: Premium form card -->
          <div class="contact-left-col">
            <div class="contact-form-card">
              <h2 class="contact-form-title">Get in Touch with TRAQQ</h2>
              <p class="contact-form-subtitle">Have a question about your booking, airport transfer, or corporate travel needs? Send us a message and our support team will get back to you shortly.</p>
              <p class="contact-form-microcopy">We typically respond as quickly as possible during business hours.</p>

              <div class="contact-trust-badges">
                <span class="contact-trust-badge"><i data-lucide="shield-check" class="icon-xs"></i> Secure Inquiry</span>
                <span class="contact-trust-badge"><i data-lucide="check-circle" class="icon-xs"></i> Booking Support</span>
                <span class="contact-trust-badge"><i data-lucide="plane" class="icon-xs"></i> DFW Airport Service</span>
                <span class="contact-trust-badge"><i data-lucide="check-circle" class="icon-xs"></i> Fast Response</span>
              </div>

              <form id="contact-form" class="contact-form" novalidate>
                <div class="contact-form-inner-grid">
                  <div class="form-group">
                    <label class="form-label" for="c-name">Full Name <span class="required">*</span></label>
                    <input type="text" class="form-input" id="c-name" placeholder="Enter your full name" autocomplete="name" />
                    <p class="field-error" id="err-name">Please enter your full name.</p>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="c-email">Email Address <span class="required">*</span></label>
                    <input type="email" class="form-input" id="c-email" placeholder="Enter your email address" autocomplete="email" />
                    <p class="field-error" id="err-email">Please enter a valid email address.</p>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="c-phone">Phone Number <span class="required">*</span></label>
                    <input type="tel" class="form-input" id="c-phone" placeholder="Enter your phone number" autocomplete="tel" />
                    <p class="field-error" id="err-phone">Please enter your phone number.</p>
                  </div>

                  <div class="form-group">
                    <label class="form-label" for="c-type">Inquiry Type <span class="required">*</span></label>
                    <select class="form-input contact-form-select" id="c-type">
                      <option value="">Select inquiry type</option>
                      <option value="booking">Booking Support</option>
                      <option value="transfer">Airport Transfer Question</option>
                      <option value="payment">Payment Question</option>
                      <option value="corporate">Corporate Travel</option>
                      <option value="general">General Inquiry</option>
                    </select>
                    <p class="field-error" id="err-type">Please select an inquiry type.</p>
                  </div>

                  <div class="form-group full-width">
                    <label class="form-label" for="c-message">Message <span class="required">*</span></label>
                    <textarea class="form-input form-textarea" id="c-message" rows="5" placeholder="Tell us how we can help..."></textarea>
                    <p class="field-error" id="err-message">Message must be at least 10 characters.</p>
                  </div>
                </div>

                <button type="submit" class="btn btn-primary btn-full" id="contact-submit">Send Message</button>
                <p class="contact-submit-note">By submitting this form, you agree that TRAQQ may contact you about your inquiry.</p>
              </form>
            </div>
          </div>

          <!-- RIGHT: Image slider + assist card -->
          <div class="contact-right-col">
            <div class="img-slider" id="contactSlider">
              <div class="img-slider-track" id="sliderTrack">
                ${SLIDER_IMAGES.map(img => `
                  <div class="img-slider-slide">
                    <img src="${img.src}" alt="${img.alt}" loading="lazy" />
                  </div>`).join('')}
              </div>
              <button class="img-slider-arrow img-slider-prev" id="sliderPrev" aria-label="Previous">&#8592;</button>
              <button class="img-slider-arrow img-slider-next" id="sliderNext" aria-label="Next">&#8594;</button>
              <div class="img-slider-dots" id="sliderDots">
                ${SLIDER_IMAGES.map((_, i) => `
                  <button class="img-slider-dot${i === 0 ? ' active' : ''}" data-index="${i}" aria-label="Slide ${i + 1}"></button>`).join('')}
              </div>
            </div>
            <p class="slider-caption">Premium private airport shuttle service to DFW Airport terminals A, B, C, D, and E</p>

            <div class="contact-assist-card">
              <h4 class="contact-assist-title">Need Immediate Assistance?</h4>
              <p>For urgent booking questions, please reach out using the support details below.</p>
              <div class="contact-assist-detail">
                <span class="contact-assist-label">Email</span>
                <span class="contact-assist-val"><a href="mailto:support@mytraqq.com">support@mytraqq.com</a></span>
              </div>
              <div class="contact-assist-detail">
                <span class="contact-assist-label">Phone</span>
                <span class="contact-assist-val"><a href="tel:6823903071">682-390-3071</a></span>
              </div>
              <div class="contact-assist-detail">
                <span class="contact-assist-label">Address</span>
                <span class="contact-assist-val">5860 Collin McKinney Pkwy, Suite 605, McKinney, TX 75070</span>
              </div>
              <div class="contact-assist-detail">
                <span class="contact-assist-label">Service Area</span>
                <span class="contact-assist-val">Dallas Fort Worth, TX</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>`;

  // ── Slider logic ──────────────────────────────────────
  const track = root.querySelector('#sliderTrack');
  const dots = root.querySelectorAll('.img-slider-dot');
  const slider = root.querySelector('#contactSlider');
  const total = SLIDER_IMAGES.length;
  let current = 0;
  let timer = null;

  function goTo(idx) {
    current = (idx + total) % total;
    track.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  function startAuto() { timer = setInterval(() => goTo(current + 1), 4000); }
  function stopAuto() { clearInterval(timer); }

  root.querySelector('#sliderPrev').addEventListener('click', () => { stopAuto(); goTo(current - 1); startAuto(); });
  root.querySelector('#sliderNext').addEventListener('click', () => { stopAuto(); goTo(current + 1); startAuto(); });
  dots.forEach(dot => dot.addEventListener('click', () => { stopAuto(); goTo(Number(dot.dataset.index)); startAuto(); }));
  slider.addEventListener('mouseenter', stopAuto);
  slider.addEventListener('mouseleave', startAuto);
  startAuto();

  // ── Form validation helpers ────────────────────────────
  function getField(id) { return root.querySelector('#' + id); }
  function showError(errId, inputId) {
    root.querySelector('#' + errId).classList.add('visible');
    if (inputId) getField(inputId).classList.add('input-error');
  }
  function clearError(errId, inputId) {
    root.querySelector('#' + errId).classList.remove('visible');
    if (inputId) getField(inputId).classList.remove('input-error');
  }
  function isValidEmail(val) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val); }

  // Live clear on input
  getField('c-name').addEventListener('input', () => clearError('err-name', 'c-name'));
  getField('c-email').addEventListener('input', () => clearError('err-email', 'c-email'));
  getField('c-phone').addEventListener('input', () => clearError('err-phone', 'c-phone'));
  getField('c-type').addEventListener('change', () => clearError('err-type', 'c-type'));
  getField('c-message').addEventListener('input', () => clearError('err-message', 'c-message'));

  // ── Form submit ────────────────────────────────────────
  root.querySelector('#contact-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const name = getField('c-name').value.trim();
    const email = getField('c-email').value.trim();
    const phone = getField('c-phone').value.trim();
    const type = getField('c-type').value;
    const message = getField('c-message').value.trim();
    const btn = root.querySelector('#contact-submit');

    let hasError = false;
    if (!name) { showError('err-name', 'c-name'); hasError = true; }
    if (!email || !isValidEmail(email)) { showError('err-email', 'c-email'); hasError = true; }
    if (!phone) { showError('err-phone', 'c-phone'); hasError = true; }
    if (!type) { showError('err-type', 'c-type'); hasError = true; }
    if (!message || message.length < 10) { showError('err-message', 'c-message'); hasError = true; }

    if (hasError) return;

    btn.disabled = true;
    btn.textContent = 'Sending...';

    setTimeout(() => {
      showToast('Thank you for contacting TRAQQ. Our team will review your message and get back to you shortly.', 'success');
      root.querySelector('#contact-form').reset();
      btn.disabled = false;
      btn.textContent = 'Send Message';
    }, 1200);
  });

  return () => stopAuto();
}
