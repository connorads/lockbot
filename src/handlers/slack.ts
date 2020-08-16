import {
  App,
  ExpressReceiver,
  Logger,
  RespondFn,
  SlackCommandMiddlewareArgs,
  SlashCommand,
} from "@slack/bolt";
import { Installation } from "@slack/oauth";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { APIGatewayProxyEvent, Context } from "aws-lambda";
import * as awsServerlessExpress from "aws-serverless-express";
import * as env from "env-var";
import LockBot, { Response, Destination } from "../lock-bot";
import DynamoDBLockRepo from "../storage/dynamodb-lock-repo";
import TokenAuthorizer from "../token-authorizer";
import DynamoDBAccessTokenRepo from "../storage/dynamodb-token-repo";

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
    storeInstallation: async (installation, logger) => {
      await documentClient
        .put({
          TableName: installationsTableName,
          Item: {
            Team: installation.team.id,
            Installation: installation,
          },
        })
        .promise();
      const { team, user, bot } = installation;
      logger?.info("Installation stored.", {
        team,
        userId: user.id,
        botScopes: bot?.scopes,
      });
    },
    fetchInstallation: async (installQuery, logger) => {
      const result = await documentClient
        .get({
          TableName: installationsTableName,
          Key: { Team: installQuery.teamId },
        })
        .promise();
      const installation = result.Item?.Installation as Installation;
      const { team, user, bot } = installation;
      logger?.info("Installation fetched.", {
        team,
        userId: user.id,
        botScopes: bot?.scopes,
      });
      return Promise.resolve(installation);
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
    const respondArguments = {
      text: message,
      response_type: getResponseType(destination),
      as_user: true,
    };
    logger.info("Sending response.", respondArguments);
    await respond(respondArguments);
    logger.info("Response sent.");
  } catch (error) {
    logger.error(error);
    await respond({
      text:
        "❌ Oops, something went wrong!\n" +
        "Contact support@lockbot.app if this issue persists.",
      response_type: "ephemeral",
      as_user: true,
    });
  }
};

const handleCommand = (
  getResponse: (command: SlashCommand) => Promise<Response>
) => {
  return async ({
    command,
    logger,
    ack,
    respond,
  }: SlackCommandMiddlewareArgs & {
    logger: Logger;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, camelcase
    const { token, trigger_id, response_url, ...commandProps } = command;
    logger.info("Command received.", commandProps);
    await ack();
    const response = getResponse(command);
    await handleResponse(response, respond, logger);
    logger.info("Command handled.");
  };
};

const lockBot = new LockBot(
  new DynamoDBLockRepo(
    documentClient,
    env.get("RESOURCES_TABLE_NAME").required().asString()
  ),
  new TokenAuthorizer(
    new DynamoDBAccessTokenRepo(
      documentClient,
      env.get("ACCESS_TOKENS_TABLE_NAME").required().asString()
    )
  )
);

const stage = env.get("SERVERLESS_STAGE").required().asString();
const prefix = stage === "dev" ? "dev" : "";

const getFirstParam = (commandText: string) => commandText.split(" ")[0];

app.command(
  `/${prefix}locks`,
  handleCommand((command) => lockBot.locks(command.channel_id, command.team_id))
);
app.command(
  `/${prefix}lock`,
  handleCommand((command) =>
    lockBot.lock(
      getFirstParam(command.text),
      command.user_id,
      command.channel_id,
      command.team_id
    )
  )
);
app.command(
  `/${prefix}unlock`,
  handleCommand((command) =>
    lockBot.unlock(
      getFirstParam(command.text),
      command.user_id,
      command.channel_id,
      command.team_id
    )
  )
);

const url = env.get("IS_OFFLINE").asBool()
  ? `http://localhost/3000/${stage}`
  : env.get("API_GATEWAY_URL").required().asString();

app.command(
  `/${prefix}lbtoken`,
  handleCommand((command) =>
    lockBot.lbtoken(
      getFirstParam(command.text),
      command.user_id,
      command.channel_id,
      command.team_id,
      url
    )
  )
);

const server = awsServerlessExpress.createServer(expressReceiver.app);
const handler = (event: APIGatewayProxyEvent, context: Context) =>
  awsServerlessExpress.proxy(server, event, context);
exports.handler = handler;
