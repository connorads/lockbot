import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
} from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({
  region: "localhost",
  endpoint: "http://localhost:8000",
  credentials: {
    accessKeyId: "dummy",
    secretAccessKey: "dummy",
  },
});

export const recreateResourcesTable = async (resourcesTableName: string) => {
  try {
    await client.send(
      new DeleteTableCommand({ TableName: resourcesTableName }),
    );
  } catch {
    // No problem if the table doesn't exist
  }
  await client.send(
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
};

export const recreateAccessTokenTable = async (
  accessTokenTableName: string,
) => {
  try {
    await client.send(
      new DeleteTableCommand({ TableName: accessTokenTableName }),
    );
  } catch {
    // No problem if the table doesn't exist
  }
  await client.send(
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
};
