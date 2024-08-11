FROM node:alpine

RUN apk add chromium

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /usr/src/app

COPY . .

RUN yarn

CMD ["yarn", "start"]
