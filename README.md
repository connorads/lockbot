<p align="center">
  <img src="https://user-images.githubusercontent.com/10026538/84210020-8ffde000-aaaf-11ea-9568-e579129f4f8a.png">
</p>

# Lockbot

![Node.js CI](https://github.com/connorads/lockbot/workflows/Node.js%20CI/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/connorads/lockbot/badge.svg?branch=master)](https://coveralls.io/github/connorads/lockbot?branch=master)
[![Join Slack workspace](https://img.shields.io/badge/slack-join%20workspace-%234A154B)](https://join.slack.com/t/connorads-lockbot/shared_invite/zt-ewpng7t1-Fm78z1SMinWuG_~0DvXa8A)

> Coordinate use of your team's shared resources - in Slack 🤝

Lockbot only lets each shared resource be locked by one person at a time - like a Mutex 🔒

_Example use case: One person wants to deploy and test on a shared staging environment without someone else deploying and overwriting their deployed code, so they use `/lock staging-env` to lock the staging environment and notify the channel._

⚠ Lockbot does not have any means of physically preventing multiple users from using a locked resource and therefore your team must agree to use Lockbot whenever they start or stop using a shared resource.

**Demo**: Easily test Lockbot without adding it to your Slack workspace by trying the interactive demo on [lockbot.app](https://lockbot.app)

## How to use Lockbot

Lockbot has three commands:

- `/locks` Get locked resources list 📜
- `/lock [resource name]` Lock a resource 🔒
- `/unlock [resource name]` Unlock a resource 🔓

Each Slack channel has its own list of resources.

When someone successfully locks or unlocks a resource, the channel is notified.

## Contributing

Contributions are welcome. Please feel free to raise a GitHub issue or PR if you find a bug or join the [Lockbot Slack workspace](https://join.slack.com/t/connorads-lockbot/shared_invite/zt-ewpng7t1-Fm78z1SMinWuG_~0DvXa8A) for discussions.

## Local development

Clone the repo and ...

### Install dependencies

`yarn install`

### Lint

`yarn lint`

### Setup local DynamoDB

The automated tests run against a local DynamoDB instance

`yarn db:install`

`yarn db:start`

### Run tests

`yarn test`

### Deploy

TBC: You'll need to setup AWS, a Slack App and some Environment Variables.

`yarn deploy`
