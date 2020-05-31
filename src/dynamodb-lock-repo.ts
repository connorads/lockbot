import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { LockRepo } from "./lock-bot";

export default class DynamoDBLockRepo implements LockRepo {
  constructor(
    private readonly documentClient: DocumentClient,
    private readonly resourcesTableName: string
  ) {}

  async delete(resource: string, channel: string): Promise<void> {
    await this.documentClient
      .delete({
        TableName: this.resourcesTableName,
        Key: { Name: resource, Channel: channel },
      })
      .promise();
  }

  async getAll(channel: string): Promise<Map<string, string>> {
    const result = await this.documentClient
      .query({
        TableName: this.resourcesTableName,
        KeyConditionExpression: "Channel = :channel",
        ExpressionAttributeValues: { ":channel": channel },
      })
      .promise();
    const map = new Map<string, string>();
    if (result.Items) {
      result.Items.forEach((i) => map.set(i.Name, i.Owner));
    }
    return map;
  }

  async getOwner(
    resource: string,
    channel: string
  ): Promise<string | undefined> {
    const result = await this.documentClient
      .get({
        TableName: this.resourcesTableName,
        Key: { Name: resource, Channel: channel },
      })
      .promise();
    return result.Item?.Owner;
  }

  async setOwner(
    resource: string,
    channel: string,
    owner: string
  ): Promise<void> {
    await this.documentClient
      .put({
        TableName: this.resourcesTableName,
        Item: { Name: resource, Channel: channel, Owner: owner },
      })
      .promise();
  }
}
