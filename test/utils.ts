import DynamoDB from "aws-sdk/clients/dynamodb";

const options = {
  region: "localhost",
  endpoint: "http://localhost:8000",
};

export const recreateResourcesTable = async (resourcesTableName: string) => {
  const db = new DynamoDB(options);
  try {
    await db.deleteTable({ TableName: resourcesTableName }).promise();
  } catch (error) {
    // No problem if the table doesn't exist
  } finally {
    await db
      .createTable({
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
      .promise();
  }
};

export const recreateAccessTokenTable = async (
  accessTokenTableName: string
) => {
  const db = new DynamoDB(options);
  try {
    await db.deleteTable({ TableName: accessTokenTableName }).promise();
  } catch (error) {
    // No problem if the table doesn't exist
  } finally {
    await db
      .createTable({
        TableName: accessTokenTableName,
        AttributeDefinitions: [{ AttributeName: "Scope", AttributeType: "S" }],
        KeySchema: [{ AttributeName: "Scope", KeyType: "HASH" }],
        ProvisionedThroughput: {
          ReadCapacityUnits: 4,
          WriteCapacityUnits: 2,
        },
      })
      .promise();
  }
};
