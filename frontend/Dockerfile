FROM nginx:alpine

# Install extra dependencies for host.docker.internal access in WSL
RUN apk add --no-cache bash curl

# Copy configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy frontend files
COPY . /usr/share/nginx/html

# Create media directory with proper permissions
RUN mkdir -p /usr/share/nginx/html/media/avatars && \
    chown -R nginx:nginx /usr/share/nginx/html/media && \
    chmod -R 755 /usr/share/nginx/html/media

# Create a startup script that's correctly formatted
RUN echo '#!/bin/bash' > /docker-entrypoint.sh && \
    echo '# Add host.docker.internal to /etc/hosts for WSL compatibility' >> /docker-entrypoint.sh && \
    echo 'HOST_IP=$(ip route | grep default | awk "{print \$3}")' >> /docker-entrypoint.sh && \
    echo 'echo "$HOST_IP host.docker.internal" >> /etc/hosts' >> /docker-entrypoint.sh && \
    echo 'echo "Added host.docker.internal mapping to $HOST_IP"' >> /docker-entrypoint.sh && \
    echo '# Start Nginx' >> /docker-entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Run the startup script
CMD ["/docker-entrypoint.sh"]