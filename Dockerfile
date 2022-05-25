FROM node:18.2.0-alpine3.15 AS build
WORKDIR /build

# init workspace
COPY .yarn .yarn
COPY .yarnrc.yml package.json yarn.lock ./
RUN yarn install

# build files
COPY . .
RUN yarn build && yarn workspaces focus -A --production


FROM node:18.2.0-alpine3.15
WORKDIR /app

# copy build artifacts
COPY --from=build /build/node_modules node_modules
COPY --from=build /build/package.json /build/dist ./

CMD [ "node", "index.js" ]
