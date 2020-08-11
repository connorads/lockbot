import bcryptjs from "bcryptjs";
import crypto from "crypto";

const generateToken = () =>
  crypto
    .randomBytes(64)
    .toString("base64")
    .replace(/[^A-Za-z0-9]/g, "")
    .substring(0, 16);

export interface AccessTokenRepo {
  putAccessToken(
    accessToken: string,
    user: string,
    channel: string,
    team: string
  ): Promise<void>;
  getAccessToken(
    user: string,
    channel: string,
    team: string
  ): Promise<string | undefined>;
}

class TokenAuthorizer {
  constructor(private readonly tokenRepo: AccessTokenRepo) {}

  createAccessToken = async (user: string, channel: string, team: string) => {
    const accessToken = generateToken();
    const hashedToken = await bcryptjs.hash(accessToken, 10);
    await this.tokenRepo.putAccessToken(hashedToken, user, channel, team);
    return accessToken;
  };

  isAuthorized = async (
    accessToken: string,
    user: string,
    channel: string,
    team: string
  ) => {
    const hashedToken = await this.tokenRepo.getAccessToken(
      user,
      channel,
      team
    );

    return hashedToken ? bcryptjs.compare(accessToken, hashedToken) : false;
  };
}

export default TokenAuthorizer;
