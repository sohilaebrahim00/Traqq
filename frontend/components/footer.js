export function renderFooter(root) {
  if (!root) return;
  root.innerHTML = `
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <a class="footer-logo-link" data-link="/" href="/">
            <img src="/assets/images/logo.png" alt="TRAQQ" class="footer-logo-img"
                 onerror="this.style.display='none';this.nextElementSibling.style.display='inline';" />
            <span class="footer-logo-fallback">TRAQQ</span>
          </a>
          <p class="footer-tagline">Premium private shuttle to DFW Airport.<br/>Flat rate $99. No surprises.</p>
          <a class="btn btn-primary" data-link="/booking" href="/booking" style="margin-top:1.25rem;">Book a Ride</a>
          <div class="footer-contact-block">
            <div class="footer-contact-item">
              <a href="mailto:support@mytraqq.com">support@mytraqq.com</a>
            </div>
            <div class="footer-contact-item">5860 Collin McKinney Pkwy, Suite 605</div>
            <div class="footer-contact-item">McKinney, TX 75070</div>
            <div class="footer-contact-item">Serving Dallas Fort Worth, TX</div>
          </div>
        </div>

        <div class="footer-col">
          <p class="footer-col-title">Quick Links</p>
          <a data-link="/" href="/" class="footer-link">Home</a>
          <a data-link="/booking" href="/booking" class="footer-link">Book a Ride</a>
          <a data-link="/how-it-works" href="/how-it-works" class="footer-link">How It Works</a>
          <a data-link="/about" href="/about" class="footer-link">About TRAQQ</a>
          <a data-link="/faq" href="/faq" class="footer-link">FAQ</a>
          <a data-link="/contact" href="/contact" class="footer-link">Contact</a>
        </div>

        <div class="footer-col">
          <p class="footer-col-title">Booking</p>
          <a data-link="/booking" href="/booking" class="footer-link">Reserve a Shuttle</a>
          <a data-link="/history" href="/history" class="footer-link">My Bookings</a>
          <a data-link="/booking-details" href="/booking-details" class="footer-link">Look Up a Booking</a>
          <a data-link="/cancellation-policy" href="/cancellation-policy" class="footer-link">Cancellation Policy</a>
        </div>

        <div class="footer-col">
          <p class="footer-col-title">Legal</p>
          <a data-link="/terms" href="/terms" class="footer-link">Terms of Service</a>
          <a data-link="/privacy" href="/privacy" class="footer-link">Privacy Policy</a>
          <a data-link="/cancellation-policy" href="/cancellation-policy" class="footer-link">Cancellation Policy</a>
        </div>
      </div>

      <div class="footer-bottom">
        <p class="footer-copy">© ${new Date().getFullYear()} TRAQQ. All rights reserved. DFW Airport area.</p>
        <p class="footer-copy">Not affiliated with Dallas/Fort Worth International Airport.</p>
      </div>
    </footer>`;
}
