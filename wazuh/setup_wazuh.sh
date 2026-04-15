#!/usr/bin/env bash
# =============================================================================
# Wazuh SIEM — one-shot setup script
# =============================================================================
# Run from the project root:
#   cd /home/student/CampusNetworkSecurity
#   bash wazuh/setup_wazuh.sh
#
# What it does:
#   1. Generates TLS certificates (wazuh/config/wazuh_indexer_ssl_certs/)
#   2. Starts wazuh.indexer, wazuh.manager, wazuh.dashboard
#   3. Enrolls a local Wazuh agent on this host (optional)
#   4. Prints access URLs
# =============================================================================

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERTS_DIR="${SCRIPT_DIR}/config/wazuh_indexer_ssl_certs"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()    { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# ---------------------------------------------------------------------------
# 0. Pre-flight checks
# ---------------------------------------------------------------------------
info "Checking prerequisites..."

if ! command -v docker &>/dev/null; then
  error "Docker not found. Please install Docker first."
  exit 1
fi

if ! docker compose version &>/dev/null 2>&1; then
  error "Docker Compose plugin not found. Please install it."
  exit 1
fi

# vm.max_map_count needed by both ES and Wazuh Indexer (OpenSearch)
CURRENT_MAP_COUNT=$(sysctl -n vm.max_map_count 2>/dev/null || echo 0)
if [ "$CURRENT_MAP_COUNT" -lt 262144 ]; then
  warn "vm.max_map_count is ${CURRENT_MAP_COUNT} — setting to 262144 (required by OpenSearch)"
  sudo sysctl -w vm.max_map_count=262144 || {
    error "Could not set vm.max_map_count. Try: sudo sysctl -w vm.max_map_count=262144"
    exit 1
  }
fi

# ---------------------------------------------------------------------------
# 1. Generate TLS certificates
# ---------------------------------------------------------------------------
info "Step 1 — Generating TLS certificates..."

# Only generate if certs folder is empty (skip on re-runs)
CERT_COUNT=$(find "${CERTS_DIR}" -name "*.pem" 2>/dev/null | wc -l)
if [ "$CERT_COUNT" -gt 5 ]; then
  info "  Certificates already present (${CERT_COUNT} .pem files) — skipping generation."
else
  mkdir -p "${CERTS_DIR}"

  # Pull certs-generator image
  docker pull wazuh/wazuh-certs-generator:0.0.1 2>&1 | tail -1

  # Generate certs into the certs directory
  docker run --rm \
    -v "${CERTS_DIR}:/certificates/" \
    -v "${SCRIPT_DIR}/config/certs.yml:/config/certs.yml" \
    wazuh/wazuh-certs-generator:0.0.1

  # The generator creates files with root ownership — fix that
  sudo chown -R "$(id -u):$(id -g)" "${CERTS_DIR}" 2>/dev/null || true

  info "  Certificates written to ${CERTS_DIR}"
fi

# ---------------------------------------------------------------------------
# 2. Start the Wazuh stack
# ---------------------------------------------------------------------------
info "Step 2 — Starting Wazuh stack (indexer → manager → dashboard)..."

cd "${SCRIPT_DIR}"

# Pull images first to give clearer progress output
docker compose pull 2>&1 | grep -E "Pull|Already" || true

# Start in detached mode
docker compose up -d

info "  Containers started. Waiting for services to become healthy..."
info "  This can take 3–5 minutes on first start."

# Poll until wazuh.dashboard is healthy or timeout (5 min)
TIMEOUT=300
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' wazuh-wazuh.dashboard-1 2>/dev/null || echo "missing")
  if [ "$STATUS" = "healthy" ]; then
    info "  Wazuh Dashboard is healthy!"
    break
  fi
  printf "\r  Waiting... %ds / %ds  (status: %s)  " "$ELAPSED" "$TIMEOUT" "$STATUS"
  sleep 10
  ELAPSED=$((ELAPSED + 10))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
  warn "Timed out waiting for healthy status. Check logs: docker compose -f wazuh/docker-compose.yml logs"
fi

# ---------------------------------------------------------------------------
# 3. (Optional) Install Wazuh agent on this host
# ---------------------------------------------------------------------------
echo ""
read -rp "$(echo -e "${YELLOW}[?]${NC} Install Wazuh agent on THIS host to monitor it? [y/N] ")" INSTALL_AGENT

if [[ "$INSTALL_AGENT" =~ ^[Yy]$ ]]; then
  info "Step 3 — Installing Wazuh agent..."

  if command -v apt-get &>/dev/null; then
    # Debian/Ubuntu
    curl -s https://packages.wazuh.com/key/GPG-KEY-WAZUH \
      | sudo gpg --no-default-keyring --keyring gnupg-ring:/usr/share/keyrings/wazuh.gpg --import
    sudo chmod 644 /usr/share/keyrings/wazuh.gpg
    echo "deb [signed-by=/usr/share/keyrings/wazuh.gpg] https://packages.wazuh.com/4.x/apt/ stable main" \
      | sudo tee /etc/apt/sources.list.d/wazuh.list
    sudo apt-get update -qq
    WAZUH_MANAGER="127.0.0.1" sudo apt-get install -y wazuh-agent

  elif command -v yum &>/dev/null; then
    # RHEL/CentOS
    sudo rpm --import https://packages.wazuh.com/key/GPG-KEY-WAZUH
    cat > /tmp/wazuh.repo <<'REPO'
[wazuh]
gpgcheck=1
gpgkey=https://packages.wazuh.com/key/GPG-KEY-WAZUH
enabled=1
name=EL-$releasever - Wazuh
baseurl=https://packages.wazuh.com/4.x/yum/
protect=1
REPO
    sudo cp /tmp/wazuh.repo /etc/yum.repos.d/wazuh.repo
    WAZUH_MANAGER="127.0.0.1" sudo yum install -y wazuh-agent
  else
    warn "Could not detect package manager. Install the agent manually from https://documentation.wazuh.com/current/installation-guide/wazuh-agent/"
  fi

  sudo systemctl daemon-reload
  sudo systemctl enable --now wazuh-agent

  info "  Agent installed and started. It will auto-enroll with the manager on 127.0.0.1:1515"
else
  info "Step 3 — Skipping agent installation."
fi

# ---------------------------------------------------------------------------
# 4. Print access URLs
# ---------------------------------------------------------------------------
HOST_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "localhost")

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Wazuh SIEM is up!                                               ║${NC}"
echo -e "${GREEN}║                                                                  ║${NC}"
echo -e "${GREEN}║  Wazuh Dashboard (HTTPS, accept self-signed cert):               ║${NC}"
echo -e "${GREEN}║  https://localhost:5602                                           ║${NC}"
echo -e "${GREEN}║  https://${HOST_IP}:5602                                         ║${NC}"
echo -e "${GREEN}║                                                                  ║${NC}"
echo -e "${GREEN}║  Login:  admin / SecretPassword                                  ║${NC}"
echo -e "${GREEN}║                                                                  ║${NC}"
echo -e "${GREEN}║  Wazuh API:  https://localhost:55000                              ║${NC}"
echo -e "${GREEN}║  API user:   wazuh-wui / MyS3cr37P450r.*-                        ║${NC}"
echo -e "${GREEN}║                                                                  ║${NC}"
echo -e "${GREEN}║  To stop:   docker compose -f wazuh/docker-compose.yml down      ║${NC}"
echo -e "${GREEN}║  To logs:   docker compose -f wazuh/docker-compose.yml logs -f   ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
