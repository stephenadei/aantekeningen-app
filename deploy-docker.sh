#!/bin/bash
# Aantekeningen App Docker Deploy Script
# Thin wrapper around the generic deploy function — see
# ~/scripts/deploy/deploy-docker.sh for the shared implementation
# (docker-inspect health check (#64), docker compose v2, nginx setup).
set -e

source ~/scripts/deploy/deploy-docker.sh

deploy_docker \
    "Aantekeningen App" \
    "aantekeningen-app" \
    ".env.local" \
    "nginx-aantekeningen.conf" \
    "stephensprive.app" \
    "stephensprive.app www.stephensprive.app" \
    "package.json"

