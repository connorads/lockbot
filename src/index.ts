import {
  App,
  ExpressReceiver,
  Logger,
  RespondFn,
  SlackCommandMiddlewareArgs,
  SlashCommand,
} from "@slack/bolt";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { APIGatewayProxyEvent, Context } from "aws-lambda";
import * as awsServerlessExpress from "aws-serverless-express";
import * as env from "env-var";
import LockBot, { Response, Destination } from "./lock-bot";
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

const getResponseType = (destination: Destination) => {
  let responseType: "in_channel" | "ephemeral";
  switch (destination) {
    case "channel":
      responseType = "in_channel";
      break;
    case "user":
      responseType = "ephemeral";
      break;
  }
  return responseType;
};

const handleResponse = async (
  response: Promise<Response>,
  respond: RespondFn,
  logger: Logger
): Promise<void> => {
  try {
    const { message, destination } = await response;
    const responseType = getResponseType(destination);
    await respond({
      text: message,
      response_type: responseType,
      as_user: true,
    });
  } catch (e) {
    logger.error(e);
    await respond({
      text: `❌ Unhandled error 😢`,
      response_type: "ephemeral",
      as_user: true,
    });
  }
};

const handle = (getResponse: (command: SlashCommand) => Promise<Response>) => {
  return async ({
    command,
    logger,
    ack,
    respond,
  }: SlackCommandMiddlewareArgs & {
    logger: Logger;
  }) => {
    await ack();
    const response = getResponse(command);
    await handleResponse(response, respond, logger);
  };
};

const lockBot = new LockBot(
  new DynamoDBLockRepo(
    new DocumentClient(),
    env.get("RESOURCES_TABLE_NAME").required().asString()
  )
);

app.command(
  "/locks",
  handle((command) => lockBot.locks(command.channel_id))
);
app.command(
  "/lock",
  handle((command) =>
    lockBot.lock(command.text, command.channel_id, `<@${command.user_id}>`)
  )
);
app.command(
  "/unlock",
  handle((command) =>
    lockBot.unlock(command.text, command.channel_id, `<@${command.user_id}>`)
  )
);

const server = awsServerlessExpress.createServer(expressReceiver.app);
const handler = (event: APIGatewayProxyEvent, context: Context) =>
  awsServerlessExpress.proxy(server, event, context);
exports.handler = handler;
