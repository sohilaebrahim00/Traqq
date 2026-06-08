export default function packageSuccess(root) {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session_id');

  // Verify that there's a session to avoid direct navigation
  if (!sessionId) {
    window.location.href = '/packages';
    return;
  }

  root.innerHTML = `
    <div class="success-page" style="display:flex; align-items:center; justify-content:center; min-height:80vh;">
      <div class="card reveal-up" style="text-align:center; max-width:500px; padding:3rem;">
        <i data-lucide="check-circle" class="icon-xl" style="color:#4caf50; margin-bottom:1.5rem; display:inline-block; width:64px; height:64px;"></i>
        <h1 style="color:var(--white); margin-bottom:1rem; font-size:2rem;">Package Activated!</h1>
        <p style="color:var(--white-muted); margin-bottom:2rem; line-height:1.6;">
          Your TRAQQ monthly package has been successfully purchased and activated. You can now use your rides to book airport shuttles.
        </p>
        
        <div style="background:var(--bg-app); border:1px solid var(--border); border-radius:var(--radius); padding:1.5rem; margin-bottom:2.5rem; text-align:left;">
          <p style="color:var(--white-muted); font-size:0.85rem; margin-bottom:0.5rem;">NEXT STEPS</p>
          <p style="color:var(--white); font-size:0.95rem;">
            When you book a ride, your active package will automatically be applied if it covers your trip. 
            You can check your remaining rides in your account portal.
          </p>
        </div>

        <a class="btn btn-primary" data-link="/history" href="/history" style="width:100%; display:block; text-align:center;">Go to My Rides</a>
      </div>
    </div>`;

  if (window.lucide) window.lucide.createIcons();
}
