import {
  CreateTableCommand,
  DeleteTableCommand,
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  documentClientFrom,
  localDynamoDBClientConfig,
} from "../src/storage/document-client";

const options = localDynamoDBClientConfig;

export const createDocumentClient = () =>
  documentClientFrom(new DynamoDBClient(options));

export const recreateResourcesTable = async (resourcesTableName: string) => {
  const db = new DynamoDBClient(options);
  try {
    await db.send(new DeleteTableCommand({ TableName: resourcesTableName }));
  } catch {
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
      }),
    );
  }
};

export const recreateAccessTokenTable = async (
  accessTokenTableName: string,
) => {
  const db = new DynamoDBClient(options);
  try {
    await db.send(new DeleteTableCommand({ TableName: accessTokenTableName }));
  } catch {
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
      }),
    );
  }
};
