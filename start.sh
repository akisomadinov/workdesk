#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
if curl -fsS --max-time 2 http://127.0.0.1:5284/api/health >/dev/null 2>&1; then
    printf 'Workdesk уже запущен: http://127.0.0.1:5284\n'
    exit 0
fi
dotnet restore --configfile NuGet.Config
dotnet build --no-restore
(
    cd client
    corepack yarn install --immutable
    corepack yarn build
)
printf '\nWorkdesk: http://127.0.0.1:5284\nДля остановки нажми Ctrl+C.\n\n'
if [ -f .secrets/redis-password ]; then
    export WORKDESK_REDIS_PASSWORD_FILE="$PWD/.secrets/redis-password"
    export Workdesk__Redis="${Workdesk__Redis:-127.0.0.1:6389}"
fi
exec dotnet run --no-build --no-launch-profile --project src/Workdesk.Server
