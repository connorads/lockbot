import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Lock, LockRepo } from "../lock-bot";

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

  async getAllGlobal(): Promise<Lock[]> {
    const locks: Lock[] = [];
    const params: DocumentClient.ScanInput = {
      TableName: this.resourcesTableName,
      ExclusiveStartKey: undefined,
    };
    let results;
    do {
      // eslint-disable-next-line no-await-in-loop
      results = await this.documentClient.scan(params).promise();
      results.Items?.forEach((item) => {
        const [team, channel] = item.Group.split("#");
        locks.push({
          channel,
          team,
          name: item.Resource,
          owner: item.Owner,
          created: new Date(item.Created),
        });
      });
      params.ExclusiveStartKey = results.LastEvaluatedKey;
    } while (results.LastEvaluatedKey);
    return locks;
  }

  async getAll(
    channel: string,
    team: string
  ): Promise<Map<string, { owner: string; created: Date }>> {
    const result = await this.documentClient
      .query({
        TableName: this.resourcesTableName,
        KeyConditionExpression: "#group = :g",
        ExpressionAttributeValues: { ":g": `${team}#${channel}` },
        ExpressionAttributeNames: { "#group": "Group" },
      })
      .promise();
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
    team: string,
    metadata?: Record<string, string>
  ): Promise<void> {
    await this.documentClient
      .put({
        TableName: this.resourcesTableName,
        Item: {
          Resource: resource,
          Group: `${team}#${channel}`,
          Owner: owner,
          Created: new Date().toISOString(),
          Metadata: metadata,
        },
      })
      .promise();
  }
}
