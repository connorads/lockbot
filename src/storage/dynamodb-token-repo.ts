import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { AccessTokenRepo } from "../token-authorizer";

class DynamoDBAccessTokenRepo implements AccessTokenRepo {
  constructor(
    private readonly documentClient: DocumentClient,
    private readonly accessTokenTableName: string
  ) {}

  async putAccessToken(
    accessToken: string,
    user: string,
    channel: string,
    team: string
  ): Promise<void> {
    await this.documentClient
      .put({
        TableName: this.accessTokenTableName,
        Item: {
          Scope: `${team}#${channel}#${user}`,
          AccessToken: accessToken,
          Created: new Date().toISOString(),
        },
      })
      .promise();
  }

  async getAccessToken(
    user: string,
    channel: string,
    team: string
  ): Promise<string | undefined> {
    const result = await this.documentClient
      .get({
        TableName: this.accessTokenTableName,
        Key: { Scope: `${team}#${channel}#${user}` },
      })
      .promise();
    return result.Item?.AccessToken;
  }
}

export default DynamoDBAccessTokenRepo;
