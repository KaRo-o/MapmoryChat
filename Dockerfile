FROM node:14 AS build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

FROM node:14-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --production

COPY server.js ./
COPY --from=build /usr/src/app/build /usr/src/app/build

EXPOSE 3001

CMD ["node", "server.js"]
