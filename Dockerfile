FROM node:lts-alpine as builder

WORKDIR /app
ENV NODE_ENV=development
ENV PYTHONUNBUFFERED=1
RUN apk add --update --no-cache python3 build-base && ln -sf python3 /usr/bin/python
RUN python3 -m ensurepip
RUN pip3 install --no-cache --upgrade pip setuptools

COPY package*.json ./
COPY tsconfig*.json ./
COPY packages/ packages/

RUN npm ci
RUN npm run build


FROM node:lts-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules

CMD ["node", "packages/signer/dist/index.js"]
