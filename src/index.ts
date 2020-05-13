import {
  App,
  ExpressReceiver,
  Logger,
  AckFn,
  RespondArguments,
} from "@slack/bolt";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import * as awsServerlessExpress from "aws-serverless-express";
import * as env from "env-var";
import LockBot from "./lock-bot";
import DynamoDBLockRepo from "./dynamodb-lock-repo";

const expressReceiver = new ExpressReceiver({
  signingSecret: env.get("SLACK_SIGNING_SECRET").required().asString(),
  processBeforeResponse: true,
});
const app = new App({
  token: env.get("SLACK_BOT_TOKEN").required().asString(),
  receiver: expressReceiver,
  processBeforeResponse: true,
});

const run = async (
  logger: Logger,
  ack: AckFn<string | RespondArguments>,
  fn: () => Promise<void>
): Promise<void> => {
  try {
    await fn();
  } catch (e) {
    logger.error(e);
    await ack(`:x: Failed to post a message (error: ${e})`);
  }
};

const lockBot = new LockBot(new DynamoDBLockRepo(new DocumentClient()));
app.command("/locks", async ({ logger, ack }) => {
  await run(logger, ack, async () => {
    const message = await lockBot.locks();
    await ack(message);
  });
});
app.command("/lock", async ({ command, logger, ack, say }) => {
  await run(logger, ack, async () => {
    const message = await lockBot.lock(command.text, command.user_name);
    await say(message);
    await ack();
  });
});
app.command("/unlock", async ({ command, logger, ack, say }) => {
  await run(logger, ack, async () => {
    await say(await lockBot.unlock(command.text, command.user_name));
    await ack();
  });
});

const server = awsServerlessExpress.createServer(expressReceiver.app);
const handler = (event: any, context: any) =>
  awsServerlessExpress.proxy(server, event, context);
exports.handler = handler;
