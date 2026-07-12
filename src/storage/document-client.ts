import type {
  DynamoDBClient,
  DynamoDBClientConfig,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export const localDynamoDBClientConfig: DynamoDBClientConfig = {
  region: "localhost",
  endpoint: "http://localhost:8000",
  // DynamoDB Local accepts any credentials but the v3 credential chain
  // throws if none are configured
  credentials: { accessKeyId: "dummy", secretAccessKey: "dummy" },
};

export const documentClientFrom = (client: DynamoDBClient) =>
  DynamoDBDocumentClient.from(client, {
    // aws-sdk v2 silently dropped undefined values (e.g. optional lock
    // Metadata, optional fields inside the Slack Installation); v3 throws
    // without this
    marshallOptions: { removeUndefinedValues: true },
  });
