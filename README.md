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

Lockbot has three main commands:

- `/locks` Get locked resources list 📜
- `/lock [resource-name]` Lock a resource 🔒
- `/unlock [resource-name] [options]` Unlock a resource 🔓
  - Set `[options]` to `force` if you need to unlock when someone is away on holiday ⛱

Each Slack channel has its own list of resources.

When someone successfully locks or unlocks a resource, the channel is notified.

## Lockbot API

It is possible to view, create and delete locks via the Lockbot HTTP API.

To explore the API take a look at the [OpenAPI spec](src/handlers/swagger/openapi.json).

The API is secured using basic access authentication.

- `/lbtoken` Learn about Lockbot API access tokens 💡
- `/lbtoken new` Generate a new Lockbot API access token 🎫

Each access token is scoped to the Slack `team` and `channel` they were created in and to the `user` who created them.

## Contributing

Don't be a stranger, contributions are welcome ✨

See the [Contributing Guide](https://github.com/connorads/lockbot/blob/master/CONTRIBUTING.md) for development setup instructions.

- Give this repo a Star ⭐️
- Ask questions and share your feedback in [issues](https://github.com/connorads/lockbot/issues)
- Create a PR or issue for bugs, enhancements, ideas and suggestions
- Join the [Lockbot Community Slack workspace](https://join.slack.com/t/connorads-lockbot/shared_invite/zt-ewpng7t1-Fm78z1SMinWuG_~0DvXa8A)
- Contact [@connorads](https://connoradams.co.uk)

## Security

If you discover a security vulnerability, please send an e-mail to security@lockbot.app
