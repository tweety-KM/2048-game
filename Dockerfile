# Use a lightweight web server as our base
FROM nginx:alpine

# Copy our game files into the web server's serving folder
COPY . /usr/share/nginx/html

# Tell Docker this container listens on port 80
EXPOSE 80

# Start the web server
CMD ["nginx", "-g", "daemon off;"]