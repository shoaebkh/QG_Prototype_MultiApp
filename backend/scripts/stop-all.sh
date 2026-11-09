#!/usr/bin/env bash
# Stops exactly the four PIDs start-all.sh recorded - never a blanket
# pkill, so it can't take down an unrelated java process on the machine.
cd "$(dirname "$0")/.."

for name in service-service sales-service analytics-service api-gateway; do
  pidfile="scripts/logs/${name}.pid"
  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile")
    if kill "$pid" 2>/dev/null; then
      echo "stopped $name (pid $pid)"
    else
      echo "$name (pid $pid) was not running"
    fi
    rm -f "$pidfile"
  fi
done
