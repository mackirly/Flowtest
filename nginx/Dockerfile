FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/default.conf /etc/nginx/conf.d/default.conf

# Create necessary directories
RUN mkdir -p /app/media /app/static

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]