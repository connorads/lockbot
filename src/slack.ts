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
import DynamoDBLockRepo from "./storage/dynamodb-lock-repo";

const documentClient = new DocumentClient();

const installationsTableName = env
  .get("INSTALLATIONS_TABLE_NAME")
  .required()
  .asString();

const expressReceiver = new ExpressReceiver({
  signingSecret: env.get("SLACK_SIGNING_SECRET").required().asString(),
  clientId: env.get("SLACK_CLIENT_ID").required().asString(),
  clientSecret: env.get("SLACK_CLIENT_SECRET").required().asString(),
  stateSecret: env.get("STATE_SECRET").required().asString(),
  scopes: ["commands"],
  processBeforeResponse: true,
  installationStore: {
    storeInstallation: async (installation) => {
      await documentClient
        .put({
          TableName: installationsTableName,
          Item: {
            Team: installation.team.id,
            Installation: installation,
          },
        })
        .promise();
    },
    fetchInstallation: async (installQuery) => {
      const result = await documentClient
        .get({
          TableName: installationsTableName,
          Key: { Team: installQuery.teamId },
        })
        .promise();
      return Promise.resolve(result.Item?.Installation);
    },
  },
});

const app = new App({
  receiver: expressReceiver,
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
    documentClient,
    env.get("RESOURCES_TABLE_NAME").required().asString()
  )
);

const getResource = (commandText: string) => commandText.split(" ")[0];

app.command(
  "/locks",
  handle((command) => lockBot.locks(command.channel_id, command.team_id))
);
app.command(
  "/lock",
  handle((command) =>
    lockBot.lock(
      getResource(command.text),
      `<@${command.user_id}>`,
      command.channel_id,
      command.team_id
    )
  )
);
app.command(
  "/unlock",
  handle((command) =>
    lockBot.unlock(
      getResource(command.text),
      `<@${command.user_id}>`,
      command.channel_id,
      command.team_id
    )
  )
);

const server = awsServerlessExpress.createServer(expressReceiver.app);
const handler = (event: APIGatewayProxyEvent, context: Context) =>
  awsServerlessExpress.proxy(server, event, context);
exports.handler = handler;
