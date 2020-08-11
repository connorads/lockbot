import TokenAuthorizer from "./token-authorizer";

export interface LockRepo {
  delete(resource: string, channel: string, team: string): Promise<void>;
  getAll(channel: string, team: string): Promise<Map<string, string>>;
  getOwner(
    resource: string,
    channel: string,
    team: string
  ): Promise<string | undefined>;
  setOwner(
    resource: string,
    owner: string,
    channel: string,
    team: string
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
    team: string
  ): Promise<Response> => {
    if (!resource || resource === "help") {
      return {
        message:
          "How to use `/lock`\n\n" +
          "To lock a resource in this channel called `thingy`, use `/lock thingy`\n\n" +
          "_Example:_\n" +
          `> *${user}*: \`/lock dev\`\n` +
          `> *Lockbot*: ${user} has locked \`dev\` 🔒`,
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
        message: `\`${resource}\` is already locked by ${lockOwner} 🔒`,
        destination: "user",
      };
    }
    await this.lockRepo.setOwner(resource, user, channel, team);
    return {
      message: `${user} has locked \`${resource}\` 🔒`,
      destination: "channel",
    };
  };

  unlock = async (
    resource: string,
    user: string,
    channel: string,
    team: string
  ): Promise<Response> => {
    if (!resource || resource === "help") {
      return {
        message:
          "How to use `/unlock`\n\n" +
          "To unlock a resource in this channel called `thingy`, use `/unlock thingy`\n\n" +
          "_Example:_\n" +
          `> *${user}*: \`/unlock dev\`\n` +
          `> *Lockbot*: ${user} has unlocked \`dev\` 🔓`,
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
        message: `${user} has unlocked \`${resource}\` 🔓`,
        destination: "channel",
      };
    }
    return {
      message: `Cannot unlock \`${resource}\`, locked by ${lockOwner} 🔒`,
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
    locks.forEach((lockOwner, lockedResource) => {
      locksMessage += `> \`${lockedResource}\` is locked by ${lockOwner} 🔒\n`;
    });
    return { message: locksMessage.trimRight(), destination: "user" };
  };

  lbtoken = async (
    param: string,
    user: string,
    channel: string,
    team: string
  ): Promise<Response> => {
    if (param !== "new") {
      return {
        message: "How to use `/lbtoken`\n\n Get a token blah\n",
        destination: "user",
      };
    }
    const accessToken = await this.tokenAuthorizer.createAccessToken(
      user,
      channel,
      team
    );
    return {
      message:
        `Here is your access token: \`${accessToken}\`\n` +
        "Make note of it because it won't be displayed again.\n" +
        "If you create a new token in this channel it will invalidate this channel\n" +
        `${param} ${user} ${channel} ${team}` +
        "_Example:_\n" +
        "``` curl something something```\n",
      destination: "user",
    };
  };
}
