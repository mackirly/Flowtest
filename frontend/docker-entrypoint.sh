#!/bin/bash

# Add host.docker.internal to /etc/hosts for WSL compatibility
HOST_IP=$(ip route | grep default | awk "{print \$3}")
echo "$HOST_IP host.docker.internal" >> /etc/hosts
echo "Added host.docker.internal mapping to $HOST_IP"

# Start Nginx
exec nginx -g "daemon off;"