#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")/.."
umask 077
mkdir -p .secrets
chmod 700 .secrets
if [ ! -s .secrets/redis-password ]; then openssl rand -hex 32 > .secrets/redis-password; fi
if [ ! -s .secrets/master-key ]; then openssl rand 32 > .secrets/master-key; fi
python3 - <<'PY'
from pathlib import Path
p=Path('.secrets/redis-password').read_text().strip()
Path('.secrets/users.acl').write_text('user default off\nuser workdesk on >'+p+' ~workdesk:* +ping +echo +hello +client|setinfo +client|setname +info +get +set +del +eval +evalsha +script|load +xadd +xack +xdel +xgroup +xreadgroup +xautoclaim\n')
PY
# The containing directory is owner-only. The mounted files must be readable by the container's unprivileged UID.
chmod 644 .secrets/redis-password .secrets/users.acl .secrets/master-key
docker compose up -d redis
