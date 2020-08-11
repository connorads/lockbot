import { AccessTokenRepo } from "../token-authorizer";

class InMemoryAccessTokenRepo implements AccessTokenRepo {
  private readonly tokenMap: Map<string, string> = new Map();

  private static readonly separator = "😣👑🏥👂🚜📪🈺😻🐥🚟";

  private static toKey = (user: string, channel: string, team: string) => {
    return `${channel}${InMemoryAccessTokenRepo.separator}${user}${InMemoryAccessTokenRepo.separator}${team}`;
  };

  async putAccessToken(
    accessToken: string,
    user: string,
    channel: string,
    team: string
  ): Promise<void> {
    this.tokenMap.set(
      InMemoryAccessTokenRepo.toKey(user, channel, team),
      accessToken
    );
  }

  async getAccessToken(
    user: string,
    channel: string,
    team: string
  ): Promise<string | undefined> {
    return this.tokenMap.get(
      InMemoryAccessTokenRepo.toKey(user, channel, team)
    );
  }
}

export default InMemoryAccessTokenRepo;
