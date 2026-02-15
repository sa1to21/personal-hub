FROM node:25-alpine

WORKDIR /home/app

COPY package.json ./

RUN npm install

COPY . .

EXPOSE 80

CMD ["npm", "run", "dev"]
