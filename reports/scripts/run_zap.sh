#!/bin/bash
TARGET="http://localhost:4000"

echo "Starting OWASP ZAP baseline scan..."
docker run -t owasp/zap2docker-stable zap-baseline.py \
    -t $TARGET \
    -r /zap/wrk/zap_report.html

docker cp $(docker ps -lq):/zap/wrk/zap_report.html ./reports/zap_report.html
echo "ZAP report saved to ./reports/zap_report.html"
