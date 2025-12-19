import TokenAuthorizer from "./token-authorizer";
import { ChannelConfigRepo, LockMode } from "./storage/channel-config-repo";
import { parseDuration, formatDuration } from "./utils/duration-parser";

export interface LockRepo {
  delete(resource: string, channel: string, team: string): Promise<void>;
  getAll(
    channel: string,
    team: string,
  ): Promise<Map<string, { owner: string; created: Date; expiresAt?: Date }>>;
  getOwner(
    resource: string,
    channel: string,
    team: string,
  ): Promise<string | undefined>;
  setOwner(
    resource: string,
    owner: string,
    channel: string,
    team: string,
    metadata?: Record<string, string>,
    expiresAt?: Date,
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
    private readonly tokenAuthorizer: TokenAuthorizer,
    private readonly channelConfigRepo?: ChannelConfigRepo,
  ) {}

  lock = async (
    resource: string,
    user: string,
    channel: string,
    team: string,
    metadata?: Record<string, string>,
    expiryDuration?: string,
  ): Promise<Response> => {
    if (!resource || resource === "help") {
      return {
        message:
          "How to use `/lock`\n\n" +
          "To lock a resource in this channel called `thingy`, use `/lock thingy`\n\n" +
          "To lock with an expiry, use `/lock thingy --expiry 2h`\n\n" +
          "_Example:_\n" +
          `> *<@${user}>*: \`/lock dev\`\n` +
          `> *Lockbot*: <@${user}> has locked \`dev\` 🔒`,
        destination: "user",
      };
    }

    // Check channel config for lock mode
    const config = await this.channelConfigRepo?.getConfig(channel, team);
    if (config?.lockMode === "strict") {
      if (!config.resources.has(resource)) {
        const resourceList =
          config.resources.size > 0
            ? Array.from(config.resources).join(", ")
            : "none defined";
        return {
          message:
            `Resource \`${resource}\` is not in the predefined list.\n` +
            `Available resources: ${resourceList}\n` +
            `Use \`/list-resources\` to see all available resources.`,
          destination: "user",
        };
      }
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

    // Calculate expiry
    let expiresAt: Date | undefined;
    if (expiryDuration) {
      const seconds = parseDuration(expiryDuration);
      if (seconds === null) {
        return {
          message: `Invalid expiry duration: \`${expiryDuration}\`. Use formats like \`30m\`, \`2h\`, \`1d\`.`,
          destination: "user",
        };
      }
      expiresAt = new Date(Date.now() + seconds * 1000);
    } else if (config?.defaultExpiry && config.defaultExpiry > 0) {
      expiresAt = new Date(Date.now() + config.defaultExpiry * 1000);
    }

    await this.lockRepo.setOwner(
      resource,
      user,
      channel,
      team,
      metadata,
      expiresAt,
    );

    let message = `<@${user}> has locked \`${resource}\` 🔒`;
    if (expiresAt) {
      const expiryTimestamp = Math.floor(expiresAt.getTime() / 1000);
      message += ` (expires <!date^${expiryTimestamp}^{date_short} {time}|${expiresAt.toISOString()}>)`;
    }

    return {
      message,
      destination: "channel",
    };
  };

  unlock = async (
    resource: string,
    user: string,
    channel: string,
    team: string,
    options: { force: boolean },
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
    locks.forEach(
      ({ owner: lockOwner, created: lockDate, expiresAt }, lockedResource) => {
        locksMessage +=
          `> \`${lockedResource}\` is locked by <@${lockOwner}> 🔒` +
          ` _<!date^${Math.floor(
            lockDate.valueOf() / 1000,
          )}^{date_pretty} {time}|${lockDate.toUTCString()}>_`;
        if (expiresAt) {
          const expiryTimestamp = Math.floor(expiresAt.getTime() / 1000);
          locksMessage += ` (expires <!date^${expiryTimestamp}^{date_short} {time}|${expiresAt.toISOString()}>)`;
        }
        locksMessage += "\n";
      },
    );
    return { message: locksMessage.trimEnd(), destination: "user" };
  };

  lbtoken = async (
    param: string,
    user: string,
    channel: string,
    team: string,
    url: string,
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
      team,
    );
    const credentials = Buffer.from(`${user}:${accessToken}`).toString(
      "base64",
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

  // Resource management commands
  addResources = async (
    resources: string[],
    channel: string,
    team: string,
  ): Promise<Response> => {
    if (!this.channelConfigRepo) {
      return {
        message: "Resource management is not configured.",
        destination: "user",
      };
    }

    if (resources.length === 0) {
      return {
        message:
          "How to use `/add-resources`\n\n" +
          "Add predefined lockable resources for this channel:\n" +
          "`/add-resources dev staging prod`\n\n" +
          "These resources can then be locked with `/lock <resource>`.",
        destination: "user",
      };
    }

    await this.channelConfigRepo.addResources(channel, team, resources);
    return {
      message: `Added resources: ${resources.map((r) => `\`${r}\``).join(", ")}`,
      destination: "channel",
    };
  };

  removeResources = async (
    resources: string[],
    channel: string,
    team: string,
  ): Promise<Response> => {
    if (!this.channelConfigRepo) {
      return {
        message: "Resource management is not configured.",
        destination: "user",
      };
    }

    if (resources.length === 0) {
      return {
        message:
          "How to use `/remove-resources`\n\n" +
          "Remove predefined resources from this channel:\n" +
          "`/remove-resources dev staging`",
        destination: "user",
      };
    }

    await this.channelConfigRepo.removeResources(channel, team, resources);
    return {
      message: `Removed resources: ${resources.map((r) => `\`${r}\``).join(", ")}`,
      destination: "channel",
    };
  };

  listResources = async (channel: string, team: string): Promise<Response> => {
    if (!this.channelConfigRepo) {
      return {
        message: "Resource management is not configured.",
        destination: "user",
      };
    }

    const config = await this.channelConfigRepo.getConfig(channel, team);
    if (!config || config.resources.size === 0) {
      return {
        message:
          "No predefined resources in this channel.\n" +
          "Use `/add-resources <name1> <name2> ...` to add some.",
        destination: "user",
      };
    }

    const resourceList = Array.from(config.resources)
      .map((r) => `\`${r}\``)
      .join(", ");
    const modeDesc =
      config.lockMode === "strict"
        ? "Only predefined resources can be locked"
        : "Any resource can be locked";
    const expiryDesc =
      config.defaultExpiry > 0
        ? formatDuration(config.defaultExpiry)
        : "none (locks don't expire)";

    return {
      message:
        `*Channel Resources Configuration*\n\n` +
        `*Resources:* ${resourceList}\n` +
        `*Lock Mode:* ${config.lockMode} (${modeDesc})\n` +
        `*Default Expiry:* ${expiryDesc}`,
      destination: "user",
    };
  };

  setLockMode = async (
    mode: string,
    channel: string,
    team: string,
  ): Promise<Response> => {
    if (!this.channelConfigRepo) {
      return {
        message: "Resource management is not configured.",
        destination: "user",
      };
    }

    if (mode !== "strict" && mode !== "flexible") {
      return {
        message:
          "How to use `/set-lock-mode`\n\n" +
          "Set the lock mode for this channel:\n" +
          "`/set-lock-mode strict` - Only predefined resources can be locked\n" +
          "`/set-lock-mode flexible` - Any resource can be locked (default)",
        destination: "user",
      };
    }

    await this.channelConfigRepo.setLockMode(channel, team, mode as LockMode);
    const modeDesc =
      mode === "strict"
        ? "Only predefined resources can be locked"
        : "Any resource can be locked";
    return {
      message: `Lock mode set to *${mode}*. ${modeDesc}.`,
      destination: "channel",
    };
  };

  setLockExpiry = async (
    durationInput: string,
    channel: string,
    team: string,
  ): Promise<Response> => {
    if (!this.channelConfigRepo) {
      return {
        message: "Resource management is not configured.",
        destination: "user",
      };
    }

    if (!durationInput) {
      return {
        message:
          "How to use `/set-lock-expiry`\n\n" +
          "Set the default lock expiry for this channel:\n" +
          "`/set-lock-expiry 2h` - Locks expire after 2 hours\n" +
          "`/set-lock-expiry 30m` - Locks expire after 30 minutes\n" +
          "`/set-lock-expiry 1d` - Locks expire after 1 day\n" +
          "`/set-lock-expiry 0` - Disable auto-expiry (default)\n\n" +
          "Individual locks can override this with `/lock <resource> --expiry <duration>`",
        destination: "user",
      };
    }

    if (durationInput === "0" || durationInput.toLowerCase() === "none") {
      await this.channelConfigRepo.setDefaultExpiry(channel, team, 0);
      return {
        message: "Default lock expiry disabled. Locks will not auto-expire.",
        destination: "channel",
      };
    }

    const seconds = parseDuration(durationInput);
    if (seconds === null) {
      return {
        message: `Invalid duration: \`${durationInput}\`. Use formats like \`30m\`, \`2h\`, \`1d\`.`,
        destination: "user",
      };
    }

    await this.channelConfigRepo.setDefaultExpiry(channel, team, seconds);
    return {
      message: `Default lock expiry set to *${formatDuration(seconds)}*. New locks will auto-expire after this duration.`,
      destination: "channel",
    };
  };
}
