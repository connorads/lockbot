import TokenAuthorizer from "./token-authorizer";

export type Lock = {
  channel: string;
  team: string;
  name: string;
  owner: string;
  created: Date;
};

export interface LockRepo {
  delete(resource: string, channel: string, team: string): Promise<void>;
  getAllGlobal(): Promise<Lock[]>;
  getAll(
    channel: string,
    team: string
  ): Promise<Map<string, { owner: string; created: Date }>>;
  getOwner(
    resource: string,
    channel: string,
    team: string
  ): Promise<string | undefined>;
  setOwner(
    resource: string,
    owner: string,
    channel: string,
    team: string,
    metadata?: Record<string, string>
  ): Promise<void>;
}

export type Destination = "user" | "channel";

export interface Response {
  message: string;
  destination: Destination;
}

export default class LockBot {
  constructor(
    private readonly lockRepo: LockRepo,
    private readonly tokenAuthorizer: TokenAuthorizer
  ) {}

  lock = async (
    resource: string,
    user: string,
    channel: string,
    team: string,
    metadata?: Record<string, string>
  ): Promise<Response> => {
    if (!resource || resource === "help") {
      return {
        message:
          "How to use `/lock`\n\n" +
          "To lock a resource in this channel called `thingy`, use `/lock thingy`\n\n" +
          "_Example:_\n" +
          `> *<@${user}>*: \`/lock dev\`\n` +
          `> *Lockbot*: <@${user}> has locked \`dev\` 🔒`,
        destination: "user",
      };
    }
    const lockOwner = await this.lockRepo.getOwner(resource, channel, team);
    if (lockOwner) {
      if (user === lockOwner) {
        return {
          message: `You have already locked \`${resource}\` 🔒`,
          destination: "user",
        };
      }
      return {
        message: `\`${resource}\` is already locked by <@${lockOwner}> 🔒`,
        destination: "user",
      };
    }
    await this.lockRepo.setOwner(resource, user, channel, team, metadata);
    return {
      message: `<@${user}> has locked \`${resource}\` 🔒`,
      destination: "channel",
    };
  };

  unlock = async (
    resource: string,
    user: string,
    channel: string,
    team: string,
    options: { force: boolean }
  ): Promise<Response> => {
    if (!resource || resource === "help") {
      return {
        message:
          "How to use `/unlock`\n\n" +
          "To unlock a resource in this channel called `thingy`, " +
          "use `/unlock thingy`\n\n_Example:_\n" +
          `> *<@${user}>*: \`/unlock dev\`\n` +
          `> *Lockbot*: <@${user}> has unlocked \`dev\` 🔓\n\n` +
          "To force unlock a resource locked by someone else, " +
          "use `/unlock thingy force`",
        destination: "user",
      };
    }
    const lockOwner = await this.lockRepo.getOwner(resource, channel, team);
    if (!lockOwner) {
      return {
        message: `\`${resource}\` is already unlocked 🔓`,
        destination: "user",
      };
    }

    if (user === lockOwner) {
      await this.lockRepo.delete(resource, channel, team);
      return {
        message: `<@${user}> has unlocked \`${resource}\` 🔓`,
        destination: "channel",
      };
    }
    if (user !== lockOwner && options.force) {
      await this.lockRepo.delete(resource, channel, team);
      return {
        message:
          `<@${user}> has force unlocked \`${resource}\` 🔓 ` +
          `which was locked by <@${lockOwner}>`,
        destination: "channel",
      };
    }
    return {
      message: `Cannot unlock \`${resource}\`, locked by <@${lockOwner}> 🔒`,
      destination: "user",
    };
  };

  locks = async (channel: string, team: string): Promise<Response> => {
    const locks = await this.lockRepo.getAll(channel, team);
    if (locks.size === 0) {
      return {
        message: `No active locks in this channel 🔓`,
        destination: "user",
      };
    }
    let locksMessage = "Active locks in this channel:\n";
    locks.forEach(({ owner: lockOwner, created: lockDate }, lockedResource) => {
      locksMessage +=
        `> \`${lockedResource}\` is locked by <@${lockOwner}> 🔒` +
        ` _<!date^${Math.floor(
          lockDate.valueOf() / 1000
        )}^{date_pretty} {time}|${lockDate.toUTCString()}>_\n`;
    });
    return { message: locksMessage.trimRight(), destination: "user" };
  };

  lbtoken = async (
    param: string,
    user: string,
    channel: string,
    team: string,
    url: string
  ): Promise<Response> => {
    if (param !== "new") {
      return {
        message:
          "How to use `/lbtoken`\n\n" +
          "To generate a new access token for the " +
          "Lockbot API use `/lbtoken new`\n\n" +
          `• The token is scoped to your user \`${user}\`, ` +
          `this team \`${team}\` and this channel \`${channel}\`\n` +
          "• Make a note of your token as it won't be displayed again\n" +
          "• If you generate a new token in this channel it will " +
          "invalidate the existing token for this channel\n\n" +
          "The API is secured using basic access authentication. " +
          "To authenticate with the API you must set a header:\n" +
          "```Authorization: Basic <credentials>```\n" +
          "where `<credentials>` is `user:token` base64 encoded\n\n" +
          `Explore the Lockbot API with OpenAPI 3 ` +
          `and Swagger UI: ${url}/api-docs`,
        destination: "user",
      };
    }
    const accessToken = await this.tokenAuthorizer.createAccessToken(
      user,
      channel,
      team
    );
    const credentials = Buffer.from(`${user}:${accessToken}`).toString(
      "base64"
    );
    const auth = `--header 'Authorization: Basic ${credentials}'`;
    const baseUrl = `${url}/api/teams/${team}/channels/${channel}/locks`;
    const get = "--request GET";
    const del = "--request DELETE";
    const post = "--request POST";
    const json = "--header 'Content-Type: application/json'";
    const body = `--data-raw '{ "name": "dev", "owner": "${user}"}'`;
    return {
      message:
        `Here is your new access token: \`${accessToken}\`\n\n` +
        "_Example API usage with `curl`:_\n\n" +
        "> Fetch all locks 📜\n" +
        `\`\`\`curl ${get} '${baseUrl}' ${auth}\`\`\`\n\n` +
        "> Fetch lock `dev` 👀\n" +
        `\`\`\`curl ${get} '${baseUrl}/dev' ${auth}\`\`\`\n\n` +
        "> Create lock `dev` 🔒\n" +
        `\`\`\`curl ${post} '${baseUrl}' ${auth} ${json} ${body}\`\`\`\n\n` +
        "> Delete lock `dev` 🔓\n" +
        `\`\`\`curl ${del} '${baseUrl}/dev' ${auth}\`\`\``,
      destination: "user",
    };
  };
}
