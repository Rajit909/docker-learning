# base image
FROM node:20-alpine

# set the working directory
WORKDIR /src

# copy package files
COPY package*.json .

#install dependencies
RUN npm install

# Copy the rest of the application code files
COPY . .

# start the application server
CMD ["npm", "run", "dev"]