import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import * as env from "env-var";
import DynamoDBLockRepo from "../../storage/dynamodb-lock-repo";
import DynamoDBAccessTokenRepo from "../../storage/dynamodb-token-repo";
import TokenAuthorizer from "../../token-authorizer";

const isOffline = env.get("IS_OFFLINE").asBool();

const client = isOffline
  ? new DynamoDBClient({
      region: "localhost",
      endpoint: "http://localhost:8000",
    })
  : new DynamoDBClient({});

const documentClient = DynamoDBDocumentClient.from(client);

export const tokenAuthorizer = new TokenAuthorizer(
  new DynamoDBAccessTokenRepo(
    documentClient,
    env.get("ACCESS_TOKENS_TABLE_NAME").required().asString(),
  ),
);

export const lockRepo = new DynamoDBLockRepo(
  documentClient,
  env.get("RESOURCES_TABLE_NAME").required().asString(),
);
