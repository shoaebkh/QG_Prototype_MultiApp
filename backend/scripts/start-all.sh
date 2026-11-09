#!/usr/bin/env bash
# Starts all four services in the background, logs to backend/scripts/logs/,
# and writes each PID to backend/scripts/logs/<name>.pid for stop-all.sh.
set -e
cd "$(dirname "$0")/.."
mkdir -p scripts/logs

start() {
  local name=$1
  local jar=$2
  nohup java -jar "$jar" > "scripts/logs/${name}.log" 2>&1 &
  echo $! > "scripts/logs/${name}.pid"
  echo "started $name (pid $!) -> scripts/logs/${name}.log"
}

start service-service   service-service/target/service-service-0.0.1-SNAPSHOT.jar
start sales-service     sales-service/target/sales-service-0.0.1-SNAPSHOT.jar
start analytics-service analytics-service/target/analytics-service-0.0.1-SNAPSHOT.jar
start api-gateway       api-gateway/target/api-gateway-0.0.1-SNAPSHOT.jar

echo "all four started - gateway:8080 sales:8081 service:8082 analytics:8083"
