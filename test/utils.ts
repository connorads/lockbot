import DynamoDB, { CreateTableInput } from "aws-sdk/clients/dynamodb";
import accessTokenTable from "../serverless/access-tokens-table";
import resourcesTable from "../serverless/resources-table";

const recreateTable = async (params: CreateTableInput) => {
  const db = new DynamoDB({
    region: "localhost",
    endpoint: "http://localhost:8000",
  });
  try {
    await db.deleteTable({ TableName: params.TableName }).promise();
  } catch (error) {
    // No problem if the table doesn't exist
  } finally {
    await db.createTable(params).promise();
  }
};

export const recreateResourcesTable = async (TableName: string) =>
  recreateTable({
    ...resourcesTable.Properties,
    TableName,
  });

export const recreateAccessTokenTable = async (TableName: string) =>
  recreateTable({
    ...accessTokenTable.Properties,
    TableName,
  });
