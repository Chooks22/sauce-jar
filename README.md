# Sauce Jar (Discord Bot)

A feature-packed Discord bot for artwork related operations.

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

# run in development mode
> yarn dev
```

### Running in Production

```sh
# create a production build
> yarn build

# register newly created commands (if applicated)
> yarn register

# start bot in production mode
> yarn start
```
