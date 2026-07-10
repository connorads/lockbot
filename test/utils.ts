import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const options = {
  region: "localhost",
  endpoint: "http://localhost:8000",
  // DynamoDB Local accepts any credentials but the v3 credential chain
  // throws if none are configured
  credentials: { accessKeyId: "dummy", secretAccessKey: "dummy" },
};

export const createDocumentClient = () =>
  DynamoDBDocumentClient.from(new DynamoDBClient(options), {
    // match production config: aws-sdk v2 silently dropped undefined values
    marshallOptions: { removeUndefinedValues: true },
  });

export const recreateResourcesTable = async (resourcesTableName: string) => {
  const db = new DynamoDBClient(options);
  try {
    await db.send(new DeleteTableCommand({ TableName: resourcesTableName }));
  } catch (error) {
    // No problem if the table doesn't exist
  } finally {
    await db.send(
      new CreateTableCommand({
        TableName: resourcesTableName,
        AttributeDefinitions: [
          { AttributeName: "Resource", AttributeType: "S" },
          { AttributeName: "Group", AttributeType: "S" },
        ],
        KeySchema: [
          { AttributeName: "Group", KeyType: "HASH" },
          { AttributeName: "Resource", KeyType: "RANGE" },
        ],
        ProvisionedThroughput: {
          ReadCapacityUnits: 4,
          WriteCapacityUnits: 4,
        },
      })
    );
  }
};

export const recreateAccessTokenTable = async (
  accessTokenTableName: string
) => {
  const db = new DynamoDBClient(options);
  try {
    await db.send(new DeleteTableCommand({ TableName: accessTokenTableName }));
  } catch (error) {
    // No problem if the table doesn't exist
  } finally {
    await db.send(
      new CreateTableCommand({
        TableName: accessTokenTableName,
        AttributeDefinitions: [{ AttributeName: "Scope", AttributeType: "S" }],
        KeySchema: [{ AttributeName: "Scope", KeyType: "HASH" }],
        ProvisionedThroughput: {
          ReadCapacityUnits: 4,
          WriteCapacityUnits: 2,
        },
      })
    );
  }
};
