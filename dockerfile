# base image
FROM node:20-alpine AS base

# set the working directory
WORKDIR /src

# copy package files
COPY package*.json .

#---------------Dependencies stage-------------
FROM base AS deps 

RUN npm ci

#------------- build ----------------
FROM deps AS build
WORKDIR /src
COPY . .
RUN npm run build

#---------- Production stage -----------
FROM node:20-alpine AS runner
WORKDIR /src

COPY --from=build /app/next.config.js ./
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 3000

ENV NODE_ENV=production

CMD ["node", "server.js"]