FROM node:18-alpine

# Install Docker CLI to interact with the host's Docker daemon
RUN apk add --no-cache docker

WORKDIR /usr/src/app

# Default environment variables for the application
ENV HASHMAP_SLOTS=512
ENV VIRTUAL_SERVER_COUNT=9
ENV SERVER_IMAGE=server-img
ENV DOCKER_NETWORK_NAME=net1
ENV INITIAL_REPLICA_COUNT=3
ENV HEALTH_CHECK_INTERVAL=10000
ENV HEALTH_CHECK_TIMEOUT=2000

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

CMD ["node", "index.js"]