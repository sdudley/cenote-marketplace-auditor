FROM node:20-alpine@sha256:d3507a213936fe4ef54760a186e113db5188472d9efdf491686bd94580a1c1e8

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

CMD ["npm", "start"]
