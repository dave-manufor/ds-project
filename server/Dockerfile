FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# The server listens on port 5000 inside the container
EXPOSE 5000

CMD ["node", "index.js"]