import {
  DynamoDBDocumentClient,
  GetCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  ChannelConfig,
  ChannelConfigRepo,
  LockMode,
} from "./channel-config-repo";

export default class DynamoDBChannelConfigRepo implements ChannelConfigRepo {
  constructor(
    private readonly documentClient: DynamoDBDocumentClient,
    private readonly channelConfigTableName: string,
  ) {}

  async getConfig(
    channel: string,
    team: string,
  ): Promise<ChannelConfig | undefined> {
    const result = await this.documentClient.send(
      new GetCommand({
        TableName: this.channelConfigTableName,
        Key: { Group: `${team}#${channel}` },
      }),
    );

    if (!result.Item) {
      return undefined;
    }

    return {
      resources: new Set((result.Item.Resources as string[]) ?? []),
      lockMode: (result.Item.LockMode as LockMode) ?? "flexible",
      defaultExpiry: (result.Item.DefaultExpiry as number) ?? 0,
    };
  }

  async addResources(
    channel: string,
    team: string,
    resources: string[],
  ): Promise<void> {
    await this.documentClient.send(
      new UpdateCommand({
        TableName: this.channelConfigTableName,
        Key: { Group: `${team}#${channel}` },
        UpdateExpression:
          "SET Resources = list_append(if_not_exists(Resources, :empty), :resources), " +
          "LockMode = if_not_exists(LockMode, :defaultMode), " +
          "DefaultExpiry = if_not_exists(DefaultExpiry, :defaultExpiry)",
        ExpressionAttributeValues: {
          ":resources": resources,
          ":empty": [],
          ":defaultMode": "flexible",
          ":defaultExpiry": 0,
        },
      }),
    );

    // Remove duplicates by reading and writing back
    const config = await this.getConfig(channel, team);
    if (config) {
      await this.documentClient.send(
        new UpdateCommand({
          TableName: this.channelConfigTableName,
          Key: { Group: `${team}#${channel}` },
          UpdateExpression: "SET Resources = :resources",
          ExpressionAttributeValues: {
            ":resources": Array.from(config.resources),
          },
        }),
      );
    }
  }

  async removeResources(
    channel: string,
    team: string,
    resources: string[],
  ): Promise<void> {
    const config = await this.getConfig(channel, team);
    if (config) {
      const resourcesToRemove = new Set(resources);
      const remainingResources = Array.from(config.resources).filter(
        (r) => !resourcesToRemove.has(r),
      );
      await this.documentClient.send(
        new UpdateCommand({
          TableName: this.channelConfigTableName,
          Key: { Group: `${team}#${channel}` },
          UpdateExpression: "SET Resources = :resources",
          ExpressionAttributeValues: {
            ":resources": remainingResources,
          },
        }),
      );
    }
  }

  async setLockMode(
    channel: string,
    team: string,
    mode: LockMode,
  ): Promise<void> {
    await this.documentClient.send(
      new UpdateCommand({
        TableName: this.channelConfigTableName,
        Key: { Group: `${team}#${channel}` },
        UpdateExpression:
          "SET LockMode = :mode, " +
          "Resources = if_not_exists(Resources, :empty), " +
          "DefaultExpiry = if_not_exists(DefaultExpiry, :defaultExpiry)",
        ExpressionAttributeValues: {
          ":mode": mode,
          ":empty": [],
          ":defaultExpiry": 0,
        },
      }),
    );
  }

  async setDefaultExpiry(
    channel: string,
    team: string,
    seconds: number,
  ): Promise<void> {
    await this.documentClient.send(
      new UpdateCommand({
        TableName: this.channelConfigTableName,
        Key: { Group: `${team}#${channel}` },
        UpdateExpression:
          "SET DefaultExpiry = :expiry, " +
          "Resources = if_not_exists(Resources, :empty), " +
          "LockMode = if_not_exists(LockMode, :defaultMode)",
        ExpressionAttributeValues: {
          ":expiry": seconds,
          ":empty": [],
          ":defaultMode": "flexible",
        },
      }),
    );
  }
}
