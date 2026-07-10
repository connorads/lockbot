import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { AccessTokenRepo } from "../token-authorizer";

class DynamoDBAccessTokenRepo implements AccessTokenRepo {
  constructor(
    private readonly documentClient: DynamoDBDocumentClient,
    private readonly accessTokenTableName: string
  ) {}

  async putAccessToken(
    accessToken: string,
    user: string,
    channel: string,
    team: string
  ): Promise<void> {
    await this.documentClient.send(
      new PutCommand({
        TableName: this.accessTokenTableName,
        Item: {
          Scope: `${team}#${channel}#${user}`,
          AccessToken: accessToken,
          Created: new Date().toISOString(),
        },
      })
    );
  }

  async getAccessToken(
    user: string,
    channel: string,
    team: string
  ): Promise<string | undefined> {
    const result = await this.documentClient.send(
      new GetCommand({
        TableName: this.accessTokenTableName,
        Key: { Scope: `${team}#${channel}#${user}` },
      })
    );
    return result.Item?.AccessToken;
  }
}

export default DynamoDBAccessTokenRepo;
