import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { LockRepo } from "../lock-bot";

export default class DynamoDBLockRepo implements LockRepo {
  constructor(
    private readonly documentClient: DocumentClient,
    private readonly resourcesTableName: string
  ) {}

  async delete(resource: string, channel: string, team: string): Promise<void> {
    await this.documentClient
      .delete({
        TableName: this.resourcesTableName,
        Key: { Resource: resource, Group: `${team}#${channel}` },
      })
      .promise();
  }

  async getAll(channel: string, team: string): Promise<Map<string, string>> {
    const result = await this.documentClient
      .query({
        TableName: this.resourcesTableName,
        KeyConditionExpression: "#group = :g",
        ExpressionAttributeValues: { ":g": `${team}#${channel}` },
        ExpressionAttributeNames: { "#group": "Group" },
      })
      .promise();
    const map = new Map<string, string>();
    if (result.Items) {
      result.Items.forEach((i) => map.set(i.Resource, i.Owner));
    }
    return map;
  }

  async getOwner(
    resource: string,
    channel: string,
    team: string
  ): Promise<string | undefined> {
    const result = await this.documentClient
      .get({
        TableName: this.resourcesTableName,
        Key: { Resource: resource, Group: `${team}#${channel}` },
      })
      .promise();
    return result.Item?.Owner;
  }

  async setOwner(
    resource: string,
    owner: string,
    channel: string,
    team: string
  ): Promise<void> {
    await this.documentClient
      .put({
        TableName: this.resourcesTableName,
        Item: {
          Resource: resource,
          Group: `${team}#${channel}`,
          Owner: owner,
          Created: new Date().toISOString(),
        },
      })
      .promise();
  }
}
