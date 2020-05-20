import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { LockRepo } from "./lock-bot";

export default class DynamoDBLockRepo implements LockRepo {
  constructor(private readonly documentClient: DocumentClient) {}

  async delete(resource: string, channel: string): Promise<void> {
    await this.documentClient
      .delete({
        TableName: "Resources",
        Key: { Name: resource, Channel: channel },
      })
      .promise();
  }

  async getAll(channel: string): Promise<Map<string, string>> {
    const result = await this.documentClient
      .query({
        TableName: "Resources",
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
        TableName: "Resources",
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
        TableName: "Resources",
        Item: { Name: resource, Channel: channel, Owner: owner },
      })
      .promise();
  }
}
