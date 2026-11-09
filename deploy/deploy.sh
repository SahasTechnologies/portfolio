#!/usr/bin/env bash
# Runs on nest. Unpacks a release, points /var/www/portfolio at it, restarts the
# service and rolls back if the new release doesn't answer.
#
#   bash deploy.sh <release-name>
set -euo pipefail

ROOT=/var/deployments/portfolio
RELEASES="$ROOT/releases"
NAME="${1:?release name required}"
DIR="$RELEASES/$NAME"
ART="$ROOT/incoming/$NAME.tgz"
LINK=/var/www/portfolio
SERVICE=portfolio
HEALTH=http://127.0.0.1:4321/

PREV="$(readlink -f "$LINK" || true)"

rollback() {
  echo "rolling back to ${PREV:-nothing}" >&2
  if [ -n "${PREV:-}" ] && [ -d "$PREV" ]; then
    ln -sfn "$PREV" "$LINK.new"
    mv -Tf "$LINK.new" "$LINK"
    systemctl restart "$SERVICE" || true
  fi
}

mkdir -p "$RELEASES"
rm -rf "$DIR"
mkdir -p "$DIR"
tar -xzf "$ART" -C "$DIR"
rm -f "$ART"

# Swap the symlink, then restart so node picks up the new code.
ln -sfn "$DIR" "$LINK.new"
mv -Tf "$LINK.new" "$LINK"
if ! systemctl restart "$SERVICE"; then
  rollback
  exit 1
fi

if ! curl -fsS --max-time 10 --retry 5 --retry-delay 1 "$HEALTH" >/dev/null; then
  echo "health check failed" >&2
  rollback
  exit 1
fi

# Keep the three newest releases.
ls -1dt "$RELEASES"/*/ 2>/dev/null | tail -n +4 | xargs -r rm -rf

echo "deployed $NAME -> $(readlink -f "$LINK")"
echo "DEPLOY_OK $NAME"
