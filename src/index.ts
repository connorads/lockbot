import {
  App,
  ExpressReceiver,
  Logger,
  AckFn,
  RespondArguments,
  SayFn,
} from "@slack/bolt";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import * as awsServerlessExpress from "aws-serverless-express";
import * as env from "env-var";
import LockBot, { Response } from "./lock-bot";
import DynamoDBLockRepo from "./dynamodb-lock-repo";

const respond = async (
  logger: Logger,
  ack: AckFn<string | RespondArguments>,
  say: SayFn,
  responsePromise: Promise<Response>
): Promise<void> => {
  try {
    const response = await responsePromise;
    switch (response.destination) {
      case "channel":
        await say(response.message);
        await ack();
        break;
      case "user":
        await ack(response.message);
        break;
    }
  } catch (e) {
    logger.error(e);
    await ack(`❌ Unhandled error 😢`);
  }
};

const expressReceiver = new ExpressReceiver({
  signingSecret: env.get("SLACK_SIGNING_SECRET").required().asString(),
  processBeforeResponse: true,
});
const app = new App({
  token: env.get("SLACK_BOT_TOKEN").required().asString(),
  receiver: expressReceiver,
  processBeforeResponse: true,
});

const lockBot = new LockBot(new DynamoDBLockRepo(new DocumentClient()));
app.command("/locks", async ({ logger, ack, say }) => {
  const responsePromise = lockBot.locks();
  await respond(logger, ack, say, responsePromise);
});
app.command("/lock", async ({ command, logger, ack, say }) => {
  const responsePromise = lockBot.lock(command.text, command.user_name);
  await respond(logger, ack, say, responsePromise);
});
app.command("/unlock", async ({ command, logger, ack, say }) => {
  const responsePromise = lockBot.unlock(command.text, command.user_name);
  await respond(logger, ack, say, responsePromise);
});

const server = awsServerlessExpress.createServer(expressReceiver.app);
const handler = (event: any, context: any) =>
  awsServerlessExpress.proxy(server, event, context);
exports.handler = handler;
