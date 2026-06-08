#!/usr/bin/env bash
# =============================================================
# TRAQQ — Deployment Verification Script
# =============================================================
# Run this ON THE VPS after every deployment.
# Usage:  bash scripts/verify-deployment.sh [https://traqq.com]
#
# Exit codes:
#   0 — all checks passed (or warnings only)
#   1 — one or more checks FAILED
# =============================================================
set -uo pipefail

BASE_URL="${1:-https://traqq.com}"
API="${BASE_URL}/api"

PASS=0
FAIL=0
WARN=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ok()     { echo -e "${GREEN}[PASS]${NC} $1"; PASS=$((PASS + 1)); }
fail()   { echo -e "${RED}[FAIL]${NC} $1"; FAIL=$((FAIL + 1)); }
warn()   { echo -e "${YELLOW}[WARN]${NC} $1"; WARN=$((WARN + 1)); }
section(){ echo -e "\n${CYAN}--- $1 ---${NC}"; }

echo ""
echo "======================================================"
echo " TRAQQ Deployment Verification"
echo " Target : $BASE_URL"
echo " Date   : $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "======================================================"

# ==============================================================
# CHECK 1 — PM2 Process Manager
# ==============================================================
section "Process Manager (PM2)"

if ! command -v pm2 &>/dev/null; then
  fail "PM2 is not installed — run: sudo npm install -g pm2"
else
  # pm2 list output contains the status word; grep for both name and status on the same line
  if pm2 list 2>/dev/null | grep "traqq-backend" | grep -q "online"; then
    RESTARTS=$(pm2 list 2>/dev/null | grep "traqq-backend" | grep -oP '\d+(?=\s*\│?\s*\d+\s*$)' | head -1 || echo "?")
    ok "PM2: traqq-backend is online"
  else
    RAW=$(pm2 list 2>/dev/null | grep "traqq-backend" || echo "not found")
    fail "PM2: traqq-backend is NOT online — status: $RAW"
  fi

  # Check PM2 startup is configured (survives reboots)
  if pm2 list 2>/dev/null | grep -q "traqq-backend" && systemctl is-enabled pm2-root 2>/dev/null | grep -q "enabled"; then
    ok "PM2: startup persistence enabled (survives reboot)"
  else
    warn "PM2: startup may not be configured — run: pm2 startup && pm2 save"
  fi
fi

# ==============================================================
# CHECK 2 — Nginx
# ==============================================================
section "Nginx Web Server"

if ! command -v nginx &>/dev/null; then
  fail "Nginx is not installed"
else
  if systemctl is-active --quiet nginx 2>/dev/null; then
    ok "Nginx: service is active (running)"
  else
    fail "Nginx: service is NOT active — run: sudo systemctl start nginx"
  fi

  if sudo nginx -t 2>&1 | grep -q "test is successful"; then
    ok "Nginx: configuration syntax is valid"
  else
    fail "Nginx: configuration has errors — run: sudo nginx -t"
  fi
fi

# ==============================================================
# CHECK 3 — PostgreSQL / Database
# ==============================================================
section "Database (PostgreSQL)"

if ! command -v psql &>/dev/null; then
  warn "PostgreSQL client not found — skipping local DB checks"
else
  if systemctl is-active --quiet postgresql 2>/dev/null; then
    ok "PostgreSQL: service is active"
  else
    fail "PostgreSQL: service is NOT active"
  fi

  if sudo -u postgres psql -lqt 2>/dev/null | cut -d'|' -f1 | grep -qw "traqq"; then
    ok "PostgreSQL: 'traqq' database exists"
  else
    fail "PostgreSQL: 'traqq' database not found — run the PostgreSQL setup steps in DEPLOY.md"
  fi
fi

# ==============================================================
# CHECK 4 — Backend Health Endpoint
# ==============================================================
section "Backend Health"

HEALTH=$(curl -sf --max-time 5 "${BASE_URL}/health" 2>/dev/null || echo "")
if echo "$HEALTH" | grep -q '"ok"'; then
  ok "Backend: /health responding correctly"
else
  fail "Backend: /health failed (response: ${HEALTH:-<empty>}) — check: pm2 logs traqq-backend"
fi

# Prove the API is reachable through Nginx (not just on 127.0.0.1:3000)
PROXY_CODE=$(curl -so /dev/null -w "%{http_code}" --max-time 5 "${API}/config" 2>/dev/null || echo "000")
if [[ "$PROXY_CODE" == "200" ]]; then
  ok "Backend: Nginx → API proxy working (/api/config returns 200)"
else
  fail "Backend: Nginx proxy failed — /api/config returned $PROXY_CODE"
fi

# Prove the DB is reachable (availability endpoint hits the database)
TODAY=$(date -u '+%Y-%m-%d')
AVAIL=$(curl -sf --max-time 8 "${API}/bookings/availability?date=${TODAY}" 2>/dev/null || echo "")
if echo "$AVAIL" | grep -q '"availableSlots"'; then
  ok "Database: connectivity confirmed via /api/bookings/availability"
else
  fail "Database: /api/bookings/availability failed — DB may not be connected (response: ${AVAIL:-<empty>})"
fi

# ==============================================================
# CHECK 5 — SSL Certificate
# ==============================================================
section "SSL / HTTPS"

HTTPS_CODE=$(curl -so /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL" 2>/dev/null || echo "000")
if [[ "$HTTPS_CODE" == "200" ]]; then
  ok "SSL: HTTPS request to $BASE_URL returns 200"
else
  fail "SSL: HTTPS request returned $HTTPS_CODE (expected 200)"
fi

# HTTP → HTTPS redirect
HTTP_REDIRECT=$(curl -so /dev/null -w "%{http_code}" --max-time 5 \
  "http://${BASE_URL#https://}" 2>/dev/null || echo "000")
if [[ "$HTTP_REDIRECT" == "301" || "$HTTP_REDIRECT" == "302" ]]; then
  ok "SSL: HTTP redirects to HTTPS ($HTTP_REDIRECT)"
else
  warn "SSL: HTTP did not redirect (got $HTTP_REDIRECT) — check Nginx HTTP block"
fi

# Certificate expiry
DOMAIN="${BASE_URL#https://}"
DOMAIN="${DOMAIN%%/*}"
SSL_END=$(echo | timeout 5 openssl s_client -servername "$DOMAIN" -connect "${DOMAIN}:443" 2>/dev/null \
  | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || echo "")
if [[ -n "$SSL_END" ]]; then
  ok "SSL: certificate valid until $SSL_END"
else
  warn "SSL: could not read certificate expiry (may still be valid)"
fi

# HSTS
HSTS_HDR=$(curl -sI --max-time 5 "$BASE_URL" 2>/dev/null | grep -i "strict-transport-security" || echo "")
if [[ -n "$HSTS_HDR" ]]; then
  ok "SSL: HSTS header present"
else
  warn "SSL: HSTS header missing — verify Nginx config includes add_header Strict-Transport-Security"
fi

# ==============================================================
# CHECK 6 — Frontend Static Files
# ==============================================================
section "Frontend (Static Files)"

INDEX_CODE=$(curl -so /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL/" 2>/dev/null || echo "000")
if [[ "$INDEX_CODE" == "200" ]]; then
  ok "Frontend: / returns 200 (index.html served)"
else
  fail "Frontend: / returned $INDEX_CODE — check Nginx root path (/var/www/traqq/frontend)"
fi

# SPA fallback — a deep route must also return 200
SPA_CODE=$(curl -so /dev/null -w "%{http_code}" --max-time 5 "$BASE_URL/booking" 2>/dev/null || echo "000")
if [[ "$SPA_CODE" == "200" ]]; then
  ok "Frontend: SPA fallback works (/booking returns 200)"
else
  warn "Frontend: /booking returned $SPA_CODE — check Nginx try_files /index.html"
fi

# ==============================================================
# CHECK 7 — Stripe Configuration
# ==============================================================
section "Stripe Configuration"

CONFIG=$(curl -sf --max-time 5 "${API}/config" 2>/dev/null || echo "")
if echo "$CONFIG" | grep -q '"stripePublishableKey"'; then
  KEY=$(echo "$CONFIG" | grep -o '"stripePublishableKey":"[^"]*"' | cut -d'"' -f4)
  if [[ "$KEY" == pk_live_* ]]; then
    ok "Stripe: LIVE publishable key is configured"
  elif [[ "$KEY" == pk_test_* ]]; then
    warn "Stripe: TEST key detected — replace with pk_live_ before taking real payments"
  elif [[ -z "$KEY" ]]; then
    fail "Stripe: STRIPE_PUBLISHABLE_KEY is empty in .env"
  else
    warn "Stripe: unexpected publishable key format — check .env"
  fi
else
  fail "Stripe: /api/config did not return expected JSON"
fi

# ==============================================================
# CHECK 8 — Stripe Webhook Secret
# ==============================================================
section "Stripe Webhook Secret"

# Send a fake webhook request. Behaviour:
#   400 = signature check ran → STRIPE_WEBHOOK_SECRET IS set (correct)
#   503 = secret missing      → STRIPE_WEBHOOK_SECRET is NOT set (wrong)
#   000 = network error
WEBHOOK_CODE=$(curl -so /dev/null -w "%{http_code}" -X POST --max-time 5 \
  -H "Content-Type: application/json" \
  -H "stripe-signature: t=1,v1=fakesig" \
  --data-raw '{"type":"test.event"}' \
  "${API}/payments/webhook" 2>/dev/null || echo "000")

if [[ "$WEBHOOK_CODE" == "400" ]]; then
  ok "Stripe webhook: STRIPE_WEBHOOK_SECRET is configured — signature verification is active"
elif [[ "$WEBHOOK_CODE" == "503" ]]; then
  fail "Stripe webhook: STRIPE_WEBHOOK_SECRET is NOT set — add it to .env and pm2 restart traqq-backend"
elif [[ "$WEBHOOK_CODE" == "000" ]]; then
  fail "Stripe webhook: endpoint unreachable — check Nginx proxy and PM2 status"
else
  warn "Stripe webhook: unexpected response $WEBHOOK_CODE"
fi

# ==============================================================
# CHECK 9 — Auth Endpoint
# ==============================================================
section "Auth Endpoint"

AUTH_RESP=$(curl -sf -X POST --max-time 5 \
  -H "Content-Type: application/json" \
  -d '{"email":"nobody@invalid.test","password":"wrong"}' \
  "${API}/auth/login" 2>/dev/null || echo "")
if echo "$AUTH_RESP" | grep -q '"error"'; then
  ok "Auth: /api/auth/login rejects invalid credentials correctly"
else
  fail "Auth: /api/auth/login returned unexpected response: ${AUTH_RESP:-<empty>}"
fi

# ==============================================================
# CHECK 10 — Admin Login Readiness
# ==============================================================
section "Admin Login"

# Read ADMIN_EMAIL from local .env if it exists (on VPS), otherwise assume default
ENV_FILE="/var/www/traqq/backend/.env"
ADMIN_EMAIL_CHECK="admin@traqq.com"
if [[ -f "$ENV_FILE" ]]; then
  LOADED=$(grep "^ADMIN_EMAIL=" "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d '"' || echo "")
  [[ -n "$LOADED" ]] && ADMIN_EMAIL_CHECK="$LOADED"
fi

# We can only confirm the admin user exists — we don't know the password here
ADMIN_RESP=$(curl -sf -X POST --max-time 5 \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL_CHECK}\",\"password\":\"__probe__\"}" \
  "${API}/auth/login" 2>/dev/null || echo "")

if echo "$ADMIN_RESP" | grep -q '"role":"ADMIN"'; then
  ok "Admin: user exists at $ADMIN_EMAIL_CHECK and login works"
elif echo "$ADMIN_RESP" | grep -q '"error"'; then
  # An error response means the endpoint reached the DB; user may just need seeding
  warn "Admin: $ADMIN_EMAIL_CHECK returned an error — run: cd /var/www/traqq/backend && npm run seed:admin"
else
  warn "Admin: unexpected probe response — verify admin email in .env and re-seed if needed"
fi

# ==============================================================
# CHECK 11 — Tracking Endpoint
# ==============================================================
section "Customer Tracking"

# A well-formed but non-existent ref must return 404 (not 500 or timeout)
TRACK_CODE=$(curl -so /dev/null -w "%{http_code}" --max-time 5 \
  "${API}/customer/bookings/TRQ-00000000/tracking" 2>/dev/null || echo "000")
if [[ "$TRACK_CODE" == "404" ]]; then
  ok "Tracking: endpoint live — returns 404 for unknown booking ref"
elif [[ "$TRACK_CODE" == "400" ]]; then
  ok "Tracking: endpoint live — returns 400 for probe ref"
elif [[ "$TRACK_CODE" == "000" ]]; then
  fail "Tracking: endpoint unreachable"
else
  warn "Tracking: unexpected response $TRACK_CODE"
fi

# ==============================================================
# CHECK 12 — Driver Login Endpoint
# ==============================================================
section "Driver Login"

DRIVER_RESP=$(curl -sf -X POST --max-time 5 \
  -H "Content-Type: application/json" \
  -d '{"email":"driver@invalid.test","password":"wrong"}' \
  "${API}/driver/login" 2>/dev/null || echo "")
if echo "$DRIVER_RESP" | grep -q '"error"'; then
  ok "Driver: /api/driver/login endpoint live and rejects bad credentials"
else
  warn "Driver: /api/driver/login unexpected response: ${DRIVER_RESP:-<empty>}"
fi

# ==============================================================
# CHECK 13 — Rate Limiting Active
# ==============================================================
section "Rate Limiting"

# Hit the API a few times rapidly and look for rate-limit headers in the response
RL_HDR=$(curl -sI --max-time 5 "${API}/auth/login" \
  -X POST -H "Content-Type: application/json" -d '{}' 2>/dev/null \
  | grep -i "ratelimit" || echo "")
if [[ -n "$RL_HDR" ]]; then
  ok "Rate limiting: RateLimit headers present on auth endpoints"
else
  warn "Rate limiting: no RateLimit headers observed — verify express-rate-limit is running"
fi

# ==============================================================
# SUMMARY
# ==============================================================
echo ""
echo "======================================================"
echo " Results:  ${GREEN}${PASS} passed${NC}  |  ${YELLOW}${WARN} warnings${NC}  |  ${RED}${FAIL} failed${NC}"
echo "======================================================"

if [[ $FAIL -gt 0 ]]; then
  echo -e "${RED}"
  echo " GO/NO-GO: NO-GO"
  echo " Fix all FAIL items before opening to customers."
  echo -e "${NC}"
  exit 1
elif [[ $WARN -gt 0 ]]; then
  echo -e "${YELLOW}"
  echo " GO/NO-GO: CONDITIONAL GO"
  echo " Deployment is functional. Review all warnings before launch."
  echo -e "${NC}"
  exit 0
else
  echo -e "${GREEN}"
  echo " GO/NO-GO: GO"
  echo " All checks passed. Safe to open to customers."
  echo -e "${NC}"
  exit 0
fi
