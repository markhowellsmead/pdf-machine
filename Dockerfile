# syntax=docker/dockerfile:1

FROM node:16.16.0

RUN apt-get update && \
  apt-get install -yq ca-certificates fonts-liberation gconf-service libappindicator1 \
  libappindicator3-1 libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 \
  libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 \
  libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 \
  libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 \
  libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release wget xdg-utils

RUN mkdir -p /usr/src/pdf-machine/node_modules && chown -R node:node /usr/src/pdf-machine && mkdir -p /usr/src/pdf-machine/public

ENV NODE_ENV=production

WORKDIR /usr/src/pdf-machine

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 80

CMD [ "node", "npm run prod" ]
