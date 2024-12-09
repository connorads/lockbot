# Contributing

Lockbot is a Slack bot written in TypeScript using [Slack's Bolt](https://slack.dev/bolt-js/tutorial/getting-started), Serverless Framework, and hosted on AWS.

The core Lockbot logic is written in plain TypeScript which means it's fairly easy to do local development using the automated tests. But this guide also covers setting up a Lockbot development environment with AWS and Slack.

Lockbot could be ported to work with a different chat platform or run on a different cloud. Raise an [issue](https://github.com/connorads/lockbot/issues) if you're interested in discussing something like this.

## Local Development

Lockbot is written with local development in mind and you can create and test most of its functionality without ever opening Slack or AWS.

### Pre-requisites

- [Node 14](http://nodejs.org/)
- [Yarn](https://yarnpkg.com/en/docs/install)
- [Java Runtime Environment](http://www.oracle.com/technetwork/java/javase/downloads/index.html) (for local DynamoDB offline)

### Install dependencies

`yarn install`

### Setup local DynamoDB

The automated tests run against a local DynamoDB instance

#### One-time install

`yarn db:install`

#### Start local DynamoDB

`yarn db:start`

### Start Serverless Offline

The API tests run HTTP calls against emulated AWS λ and API Gateway

`yarn dev`

### Run tests

`yarn test`

### Lint

`yarn lint`

## Deploy to AWS and Slack

You can create and deploy to your own Lockbot development _(or Production 🤷‍♂️)_ environment.

First we need to setup an AWS Account and Slack App before being able to deploy and use Lockbot.

### Setup AWS

#### AWS Account

[Create a free AWS account](https://portal.aws.amazon.com/gp/aws/developer/registration/index.html) or use an existing account.

You can run Lockbot on the [AWS free tier](https://aws.amazon.com/free/).

| Product            | Tier Type      | Limit                                  |
| ------------------ | -------------- | -------------------------------------- |
| AWS Lambda         | Always Free    | 1 Million free requests per month      |
| Amazon API Gateway | 12 Months Free | 1 Million API Calls Received per month |
| Amazon DynamoDB    | Always Free    | 25 GB of storage                       |

#### Setup AWS CLI

Installing and configuring the AWS CLI is a quick way to get your local machine setup with AWS and your AWS credentials.

1. [Install AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html)
2. [Configure AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html#cli-configure-quickstart-config)

#### Test deployment

Now that your local machine is set up with your AWS account let's see if you can deploy.

**Note**: _You will get warning about missing environment variables, this is fine for now._

`yarn deploy --region eu-west-1 --stage dev`

- `region` is your preferred AWS region _(default: `us-east-1`)_
- `stage` is the name you wish to give to your deployment's stage/environment _(default: `dev`)_

If everything has worked correctly then your AWS resources have been created and Lockbot has been deployed 🥳 But it won't work yet, we still need to setup the Slack App for some of the environment variables.

Severless Framework should have output some `endpoints` into your terminal. Copy and paste them somewhere safe, you'll need them later.

```
endpoints:
  POST - https://blahblahblah.amazonaws.com/dev/slack/events
  GET - https://blahblahblah.amazonaws.com/dev/slack/install
  GET - https://blahblahblah.amazonaws.com/dev/slack/oauth_redirect
```

### Setup Slack App

#### Slack Workspace for Development

You will need to create or use an existing Slack Workspace for developing your Lockbot Slack app.

#### Create Slack App

Go to [Your Slack Apps](https://api.slack.com/apps), create a new app and associate it with your desired Slack Workspace.

_(Optional)_ Update your app icon in **Settings > Basic Information > Display Information**

#### Configure Slash Commands

We must configure our Slack App's slash commands `/lock`, `/unlock`, `/locks` and `/lbtoken` to point to the `events` endpoint URL we got from our Serverless Framework `endpoints` terminal output. The same `events` endpoint can handle all of the different slash commands.

`https://blahblahblah.amazonaws.com/dev/slack/events`

Create a new Slash command by navigating to **Features > Slash Commands > Create New Command**

Make sure you enable `Escape channels, users, and links sent to your app` ☑

![Create New Command](https://user-images.githubusercontent.com/10026538/86411022-d2cc6580-bcb3-11ea-991f-788d4c5fc34c.png)

#### Get Slack Environment Variables

Navigate to **Settings > Basic Information > App Credentials** and make note of the following Slack App credentials:

- Client ID
- Client Secret
- Signing Secret

### Deploy 🚀

We're nearly ready to redeploy Lockbot, just need to set some environment variables

#### Set environment variables

Set the Slack environment variables using your Slack App Credentials.

- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `SLACK_SIGNING_SECRET`

Set the state secret environment variable to be a [random 32 character alphanumeric string](https://onlinerandomtools.com/generate-random-string).

- `STATE_SECRET`

##### dotenv

You can use `dotenv` to set environment variables. See [documentation](https://github.com/serverless/serverless/blob/master/docs/environment-variables.md) for more info.

```bash
# .env.dev
SLACK_SIGNING_SECRET = 'insertslacksigningsecrethere'
SLACK_CLIENT_ID = '1234567890.1234567890'
SLACK_CLIENT_SECRET = 'insertslackclientsecrethere'
STATE_SECRET = 'insertstatesecretehere'
```

#### "Final" deploy

Now that we've setup our Slack config let's deploy again.

`yarn deploy --region eu-west-1 --stage dev`

## Install Lockbot

We've deployed Lockbot but we need to install it to our Slack Workspace.

### Configure OAuth

Lockbot supports multiple workspaces so we must first configure OAuth so that each Slack Workspace can authenticate with Lockbot.

Add the `oauth_redirect` endpoint URL to the Redirect URLs in **Settings > Features > OAuth & Permissions**

`https://blahblahblah.amazonaws.com/dev/slack/oauth_redirect`

### Install your Slack app on your Workspace

Open your `install` endpoint URL in a browser, click the `Add to Slack` button and follow the instructions.

`https://blahblahblah.amazonaws.com/dev/slack/install`

### Test some slash commands in Slack

Open your Slack Workspace and try sending `/lock`, `/unlock` or `/locks`.

If **Lockbot** responds then congratulations, it's working!

If **Slackbot** responds with an error, take a look in your **AWS Console > Lambda > Cloudwatch Logs**

### (Optional) Configure Lockbot to send reminders

Lockbot can also send users a reminder when they've held a lock for longer than a configured amount of time.

The default reminder threshold is 4 hours, and reminders are sent twice per day (Mon-Fri).
- The reminder threshold can be configured via the `LOCK_REMINDER_THRESHOLD_MINUTES` environment variable.
- The reminder schedule can be configured via the `self:custom.lockReminderScheduleExpression` serverless variable.

To enable this feature, set the `BOT_OAUTH_TOKEN` environment variable to the value of your Bot User OAuth Token (see **Settings > Features > OAuth & Permissions**).

### Finished

Now that everything has been configured in Slack and AWS you can make changes to Lockbot code and deploy it easily with one command.

`yarn deploy --region eu-west-1 --stage dev`
