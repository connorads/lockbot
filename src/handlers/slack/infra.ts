import { App, ExpressReceiver } from "@slack/bolt";
import { Installation } from "@slack/oauth";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import * as env from "env-var";
import LockBot from "../../lock-bot";
import DynamoDBLockRepo from "../../storage/dynamodb-lock-repo";
import TokenAuthorizer from "../../token-authorizer";
import DynamoDBAccessTokenRepo from "../../storage/dynamodb-token-repo";

const documentClient = new DocumentClient();

const installationsTableName = env
  .get("INSTALLATIONS_TABLE_NAME")
  .required()
  .asString();

export const expressReceiver = new ExpressReceiver({
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

export const app = new App({
  receiver: expressReceiver,
});

export const lockBot = new LockBot(
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

export const prefix = stage === "dev" ? "dev" : "";

export const url = env.get("IS_OFFLINE").asBool()
  ? `http://localhost/3000/${stage}`
  : env.get("API_GATEWAY_URL").required().asString();
