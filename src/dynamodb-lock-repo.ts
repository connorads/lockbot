import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { LockRepo } from "./lock-bot";

export default class DynamoDBLockRepo implements LockRepo {
  constructor(private readonly documentClient: DocumentClient) {}

  async delete(resource: string): Promise<void> {
    await this.documentClient
      .delete({
        TableName: "Resources",
        Key: { Name: resource },
      })
      .promise();
  }

  async getAll(): Promise<Map<string, string>> {
    const result = await this.documentClient
      .scan({ TableName: "Resources" })
      .promise();
    const map = new Map<string, string>();
    if (result.Items) {
      result.Items.forEach((i) => map.set(i.Name, i.Owner));
    }
    return map;
  }

  async getOwner(resource: string): Promise<string | undefined> {
    const result = await this.documentClient
      .get({
        TableName: "Resources",
        Key: { Name: resource },
      })
      .promise();
    return result.Item?.Owner;
  }

  async setOwner(resource: string, owner: string): Promise<void> {
    await this.documentClient
      .put({
        TableName: "Resources",
        Item: { Name: resource, Owner: owner },
      })
      .promise();
  }
}
