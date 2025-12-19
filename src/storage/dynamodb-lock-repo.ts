import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { LockRepo } from "../lock-bot";

export default class DynamoDBLockRepo implements LockRepo {
  constructor(
    private readonly documentClient: DynamoDBDocumentClient,
    private readonly resourcesTableName: string,
  ) {}

  async delete(resource: string, channel: string, team: string): Promise<void> {
    await this.documentClient.send(
      new DeleteCommand({
        TableName: this.resourcesTableName,
        Key: { Resource: resource, Group: `${team}#${channel}` },
      }),
    );
  }

  async getAll(
    channel: string,
    team: string,
  ): Promise<Map<string, { owner: string; created: Date; expiresAt?: Date }>> {
    const result = await this.documentClient.send(
      new QueryCommand({
        TableName: this.resourcesTableName,
        KeyConditionExpression: "#group = :g",
        ExpressionAttributeValues: { ":g": `${team}#${channel}` },
        ExpressionAttributeNames: { "#group": "Group" },
      }),
    );
    const map = new Map<
      string,
      { owner: string; created: Date; expiresAt?: Date }
    >();
    if (result.Items) {
      result.Items.forEach((i) => {
        const expiresAtValue = i.ExpiresAt as number | undefined;
        map.set(i.Resource as string, {
          owner: i.Owner as string,
          created: new Date(i.Created as string),
          expiresAt: expiresAtValue
            ? new Date(expiresAtValue * 1000)
            : undefined,
        });
      });
    }
    return map;
  }

  async getOwner(
    resource: string,
    channel: string,
    team: string,
  ): Promise<string | undefined> {
    const result = await this.documentClient.send(
      new GetCommand({
        TableName: this.resourcesTableName,
        Key: { Resource: resource, Group: `${team}#${channel}` },
      }),
    );
    return result.Item?.Owner as string | undefined;
  }

  async setOwner(
    resource: string,
    owner: string,
    channel: string,
    team: string,
    metadata?: Record<string, string>,
    expiresAt?: Date,
  ): Promise<void> {
    const item: Record<string, unknown> = {
      Resource: resource,
      Group: `${team}#${channel}`,
      Owner: owner,
      Created: new Date().toISOString(),
      Metadata: metadata,
    };

    if (expiresAt) {
      const expiresAtUnix = Math.floor(expiresAt.getTime() / 1000);
      item.ExpiresAt = expiresAtUnix;
      item.TTL = expiresAtUnix;
    }

    await this.documentClient.send(
      new PutCommand({
        TableName: this.resourcesTableName,
        Item: item,
      }),
    );
  }
}
