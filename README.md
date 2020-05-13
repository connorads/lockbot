# Lockbot

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
