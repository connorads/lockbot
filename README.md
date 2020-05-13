# Lockbot

![Node.js CI](https://github.com/connorads/lockbot/workflows/Node.js%20CI/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/connorads/lockbot/badge.svg?branch=master)](https://coveralls.io/github/connorads/lockbot?branch=master)

Lockbot is a Slack bot to help coordinate use of shared resources in a team.

- `/locks`
- `/lock thingy`
- `/unlock thingy`

## Getting started

### Install dependencies

`yarn`

### Setup local DynamoDB

```shell
yarn serverless plugin install --name serverless-dynamodb-local
yarn serverless dynamodb install
yarn serverless dynamodb start
```

### Run tests

`yarn jest`

### Deploy

`yarn serverless deploy`
