# Sauce Jar (Discord Bot)

A feature-packed Discord bot for artwork related operations.

<p>
  <img alt="Pixiv Embed Preview" src="https://user-images.githubusercontent.com/49726759/172853220-53282a28-2476-4045-b2d8-6193c97361fa.png">
  <img alt="SauceNAO Preview" src="https://user-images.githubusercontent.com/49726759/172851841-e6b3ff64-123a-4c34-99ed-7ff57354d609.png">
</p>

## Features

- Parses login-locked Twitter embeds
- Replaces Twitter embeds with video with [VXTwitter](https://github.com/dylanpdx/BetterTwitFix)
- Parses Pixiv embeds into better Twitter-like multi-image embeds
- Parses Pixiv Ugoiras into MP4s
- SauceNAO integration

## Invite Link

[Click me](https://discord.com/oauth2/authorize?client_id=971780215602839562&scope=applications.commands+bot&permissions=275414837312)

## Development

### Prerequisites

[NodeJS](https://nodejs.org/) >=18.0.0  
[Yarn](https://npmjs.com/yarn) >=1.22.18

### Setting up a Dev Environment

```sh
# setup project
> git clone https://github.com/Choooks22/sauce-jar
> cd sauce-jar

# install dependencies
> yarn install

# copy the sample env file and fill out the env file
> cp .env.sample .env

# run in development mode
> yarn dev
```

### Running in Production

```sh
# create a production build
> yarn build

# register newly created commands (if applicable)
> yarn register

# start bot in production mode
> yarn start
```

### Running in Production using Docker

```sh
# images for x86-64 and arm64 exists
# you can use other methods for setting env variables
> docker run --env-file .env ghcr.io/choooks22/sauce-jar
```
