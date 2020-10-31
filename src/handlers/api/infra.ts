import { DocumentClient } from "aws-sdk/clients/dynamodb";
import * as env from "env-var";
import DynamoDBLockRepo from "../../storage/dynamodb-lock-repo";
import DynamoDBAccessTokenRepo from "../../storage/dynamodb-token-repo";
import TokenAuthorizer from "../../token-authorizer";

const documentClient = env.get("IS_OFFLINE").asBool()
  ? new DocumentClient({
      region: "localhost",
      endpoint: "http://localhost:8000",
    })
  : new DocumentClient();

export const tokenAuthorizer = new TokenAuthorizer(
  new DynamoDBAccessTokenRepo(
    documentClient,
    env.get("ACCESS_TOKENS_TABLE_NAME").required().asString()
  )
);

export const lockRepo = new DynamoDBLockRepo(
  documentClient,
  env.get("RESOURCES_TABLE_NAME").required().asString()
);
