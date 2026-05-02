# Stage 1: Build the React application
FROM node:20-slim as build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

# Write the API key into .env.local so Vite picks it up at build time.
# Vite automatically reads .env.local and makes VITE_* vars available via import.meta.env
RUN echo "VITE_GEMINI_API_KEY=AIzaSyDOTFK4qXKJe-DxQmzHw8Ge2p7NZna4TPQ" > .env.local

# Build the project (Vite bakes the VITE_GEMINI_API_KEY into the bundle at this step)
RUN npm run build

# Stage 2: Serve the app with Nginx
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts to Nginx's static file directory
COPY --from=build /app/dist /usr/share/nginx/html

# Cloud Run expects the app to listen on the port defined by the PORT environment variable.
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
