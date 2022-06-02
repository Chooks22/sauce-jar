FROM node:18.2.0-alpine3.15 AS build
WORKDIR /build

# init workspace
COPY .yarn .yarn
COPY .yarnrc.yml package.json yarn.lock ./
RUN yarn install

# build files
COPY . .
RUN yarn build && \
  rm -r dist/.yarn && \
  yarn workspaces focus -A --production


FROM node:18.2.0-alpine3.15
WORKDIR /app

# install ffmpeg
RUN apk add --no-cache ffmpeg

# copy build artifacts
COPY --from=build /build/node_modules node_modules
COPY --from=build /build/dist dist
COPY --from=build /build/sauce-jar.json package.json

CMD [ "node", "dist" ]
