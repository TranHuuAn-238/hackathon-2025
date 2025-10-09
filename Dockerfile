FROM node:18

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

# CMD ["node", "index.js"]

CMD ["npx", "nodemon", "index.js"]

# Production, once build
# COPY . .

# RUN chmod +x start.sh

# CMD [ "/bin/bash", "./start.sh" ]