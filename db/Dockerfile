FROM node:22-alpine
WORKDIR /app
COPY package*.json ./ 
RUN npm ci
COPY ./migrations ./migrations
CMD ["npm", "run", "migrate"]