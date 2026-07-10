import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import * as env from "env-var";
import DynamoDBLockRepo from "../../storage/dynamodb-lock-repo";
import DynamoDBAccessTokenRepo from "../../storage/dynamodb-token-repo";
import TokenAuthorizer from "../../token-authorizer";

const dynamoDBClient = env.get("IS_OFFLINE").asBool()
  ? new DynamoDBClient({
      region: "localhost",
      endpoint: "http://localhost:8000",
      // DynamoDB Local accepts any credentials but the v3 credential chain
      // throws if none are configured
      credentials: { accessKeyId: "dummy", secretAccessKey: "dummy" },
    })
  : new DynamoDBClient({});

const documentClient = DynamoDBDocumentClient.from(dynamoDBClient, {
  // aws-sdk v2 silently dropped undefined values (e.g. optional lock
  // Metadata); v3 throws without this
  marshallOptions: { removeUndefinedValues: true },
});

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
