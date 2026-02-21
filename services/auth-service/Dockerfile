FROM node:20-alpine

WORKDIR /home/app

COPY package.json ./

RUN apk add --no-cache python3 make g++ # pakages needed for bcrypt

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
