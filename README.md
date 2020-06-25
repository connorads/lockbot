<p align="center">
  <a href="https://lockbot.app">
    <img src="https://user-images.githubusercontent.com/10026538/84210020-8ffde000-aaaf-11ea-9568-e579129f4f8a.png">
  </a>
</p>

# Lockbot

![Node.js CI](https://github.com/connorads/lockbot/workflows/Node.js%20CI/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/connorads/lockbot/badge.svg?branch=master)](https://coveralls.io/github/connorads/lockbot?branch=master)
[![Join Slack workspace](https://img.shields.io/badge/slack-join%20workspace-%234A154B)](https://join.slack.com/t/connorads-lockbot/shared_invite/zt-ewpng7t1-Fm78z1SMinWuG_~0DvXa8A)
![MIT License](https://img.shields.io/github/license/connorads/lockbot)

**Demo**: [lockbot.app](https://lockbot.app)

> Coordinate use of your team's shared resources, in Slack 🤝

Lockbot only lets each shared resource be locked by one person at a time - like a Mutex 🔒

_Example use case: One person wants to deploy and test on a shared staging environment without someone else deploying and overwriting their deployed code, so they use `/lock staging-env` to lock the staging environment and notify the channel._

⚠ Lockbot cannot physically prevent naughty or unaware users from using a resource whilst it's locked by someone else.
Your team must agree to use Lockbot whenever they start or stop using a shared resource.

[![Add Lockbot to Slack](https://platform.slack-edge.com/img/add_to_slack.png)](https://lockbot.app)

## How to use Lockbot

Lockbot has three commands:

- `/locks` Get locked resources list 📜
- `/lock [resource name]` Lock a resource 🔒
- `/unlock [resource name]` Unlock a resource 🔓

Each Slack channel has its own list of resources.

When someone successfully locks or unlocks a resource, the channel is notified.

## Contributing

Don't be a stranger, contributions are welcome ✨

- Give this repo a Star ⭐️
- Questions, suggestions and feedback welcome in [issues](https://github.com/connorads/lockbot/issues)
- Raise an issue or PR for bugs and enhancements
- Join the [Lockbot Community Slack workspace](https://join.slack.com/t/connorads-lockbot/shared_invite/zt-ewpng7t1-Fm78z1SMinWuG_~0DvXa8A)
- Contact [@connorads](https://connoradams.co.uk)

## Security

If you discover a security vulnerability, please send an e-mail to security@lockbot.app

## Local development

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
