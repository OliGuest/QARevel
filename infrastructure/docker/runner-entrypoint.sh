#!/bin/sh
# Runner entrypoint: bring up the virtual display + VNC bridge reliably, then
# run the worker. The previous inline CMD raced (fixed `sleep 1`) and had no
# supervision, so if x11vnc lost the race or died, noVNC (websockify on :6080)
# was left with nothing on :5900 and could never connect.
set -u

DISPLAY_NUM="${DISPLAY:-:99}"
DISPLAY_N="${DISPLAY_NUM#:}"
SCREEN="${XVFB_SCREEN:-1920x1080x24}"

# Remove a stale X lock from a previous container run so Xvfb can claim :99.
rm -f "/tmp/.X${DISPLAY_N}-lock" 2>/dev/null || true

echo "[runner] starting Xvfb on ${DISPLAY_NUM} (${SCREEN})"
Xvfb "${DISPLAY_NUM}" -screen 0 "${SCREEN}" -nolisten tcp &

# Wait until the X server socket actually exists before starting x11vnc,
# instead of a blind sleep.
i=0
while [ ! -S "/tmp/.X11-unix/X${DISPLAY_N}" ] && [ "$i" -lt 60 ]; do
  i=$((i + 1))
  sleep 0.5
done
sleep 1

# Supervise x11vnc: if it ever exits, restart it so :5900 stays available.
(
  while true; do
    echo "[runner] starting x11vnc on :5900"
    x11vnc -display "${DISPLAY_NUM}" -nopw -listen 0.0.0.0 -forever -shared \
      -rfbport 5900 -noxdamage 2>&1 | sed 's/^/[x11vnc] /'
    echo "[runner] x11vnc exited; restarting in 1s"
    sleep 1
  done
) &

# Supervise websockify / noVNC on :6080.
(
  while true; do
    echo "[runner] starting websockify (noVNC) on :6080"
    websockify --web /usr/share/novnc 6080 localhost:5900 2>&1 | sed 's/^/[novnc] /'
    echo "[runner] websockify exited; restarting in 1s"
    sleep 1
  done
) &

echo "[runner] starting worker"
exec node apps/runner/dist/main.js
