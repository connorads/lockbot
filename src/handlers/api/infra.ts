import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import * as env from "env-var";
import {
  documentClientFrom,
  localDynamoDBClientConfig,
} from "../../storage/document-client";
import DynamoDBLockRepo from "../../storage/dynamodb-lock-repo";
import DynamoDBAccessTokenRepo from "../../storage/dynamodb-token-repo";
import TokenAuthorizer from "../../token-authorizer";

const dynamoDBClient = env.get("IS_OFFLINE").asBool()
  ? new DynamoDBClient(localDynamoDBClientConfig)
  : new DynamoDBClient({});

const documentClient = documentClientFrom(dynamoDBClient);

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
