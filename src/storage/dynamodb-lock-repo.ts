import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { LockRepo } from "../lock-bot";

export default class DynamoDBLockRepo implements LockRepo {
  constructor(
    private readonly documentClient: DynamoDBDocumentClient,
    private readonly resourcesTableName: string
  ) {}

  async delete(resource: string, channel: string, team: string): Promise<void> {
    await this.documentClient.send(
      new DeleteCommand({
        TableName: this.resourcesTableName,
        Key: { Resource: resource, Group: `${team}#${channel}` },
      })
    );
  }

  async getAll(
    channel: string,
    team: string
  ): Promise<Map<string, { owner: string; created: Date }>> {
    const result = await this.documentClient.send(
      new QueryCommand({
        TableName: this.resourcesTableName,
        KeyConditionExpression: "#group = :g",
        ExpressionAttributeValues: { ":g": `${team}#${channel}` },
        ExpressionAttributeNames: { "#group": "Group" },
      })
    );
    const map = new Map<string, { owner: string; created: Date }>();
    if (result.Items) {
      result.Items.forEach((i) =>
        map.set(i.Resource, { owner: i.Owner, created: new Date(i.Created) })
      );
    }
    return map;
  }

  async getOwner(
    resource: string,
    channel: string,
    team: string
  ): Promise<string | undefined> {
    const result = await this.documentClient.send(
      new GetCommand({
        TableName: this.resourcesTableName,
        Key: { Resource: resource, Group: `${team}#${channel}` },
      })
    );
    return result.Item?.Owner;
  }

  async setOwner(
    resource: string,
    owner: string,
    channel: string,
    team: string,
    metadata?: Record<string, string>
  ): Promise<void> {
    await this.documentClient.send(
      new PutCommand({
        TableName: this.resourcesTableName,
        Item: {
          Resource: resource,
          Group: `${team}#${channel}`,
          Owner: owner,
          Created: new Date().toISOString(),
          Metadata: metadata,
        },
      })
    );
  }
}
