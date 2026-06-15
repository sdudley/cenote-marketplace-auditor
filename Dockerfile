FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci && \
    npm cache clean --force && \
    rm -rf ~/.npm

COPY . .

RUN npm run build

CMD ["npm", "start"]
