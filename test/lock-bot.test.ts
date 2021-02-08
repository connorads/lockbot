import { DocumentClient } from "aws-sdk/clients/dynamodb";
import LockBot, { Response } from "../src/lock-bot";
import InMemoryLockRepo from "../src/storage/in-memory-lock-repo";
import DynamoDBLockRepo from "../src/storage/dynamodb-lock-repo";
import TokenAuthorizer from "../src/token-authorizer";
import InMemoryAccessTokenRepo from "../src/storage/in-memory-token-repo";
import DynamoDBAccessTokenRepo from "../src/storage/dynamodb-token-repo";
import { recreateResourcesTable, recreateAccessTokenTable } from "./utils";
import {
  parseUnlock,
  getFirstParam,
} from "../src/handlers/slack/command-parsers";

let lockBot: LockBot;
const runAllTests = () => {
  const execute = async (
    input: string,
    params?: { user?: string; channel?: string; team?: string }
  ): Promise<Response> => {
    const tokens = input.split(" ");
    const command = tokens[0];
    const commandText = tokens.slice(1).join(" ");
    const user = params?.user ?? "Connor";
    const channel = params?.channel ?? "general";
    const team = params?.team ?? "our-team";
    if (command === "/locks") {
      return lockBot.locks(channel, team);
    }
    if (command === "/unlock") {
      const { resource, force } = parseUnlock(commandText);
      return lockBot.unlock(resource, user, channel, team, { force });
    }
    if (command === "/lock") {
      const resource = getFirstParam(commandText);
      return lockBot.lock(resource, user, channel, team);
    }
    if (command === "/lbtoken") {
      const resource = getFirstParam(commandText);
      return lockBot.lbtoken(
        resource,
        user,
        channel,
        team,
        "https://lockbot.app"
      );
    }
    throw Error("Unhandled command");
  };

  beforeAll(() => {
    jest.useFakeTimers("modern");
    jest.setSystemTime(new Date("2020-11-23T17:37:14.135Z").getTime());
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("can lock resource", async () => {
    expect(await execute("/lock dev")).toEqual({
      message: "<@Connor> has locked `dev` 🔒",
      destination: "channel",
    });
  });
  test("can lock different resource", async () => {
    expect(await execute("/lock test")).toEqual({
      message: "<@Connor> has locked `test` 🔒",
      destination: "channel",
    });
  });
  test("can lock resource with same name in different channels", async () => {
    await execute("/lock dev");
    expect(await execute("/lock dev", { channel: "random" })).toEqual({
      message: "<@Connor> has locked `dev` 🔒",
      destination: "channel",
    });
  });
  test("cannot lock resource twice", async () => {
    await execute("/lock dev");
    expect(await execute("/lock dev")).toEqual({
      message: "You have already locked `dev` 🔒",
      destination: "user",
    });
  });
  test("cannot lock different resource twice", async () => {
    await execute("/lock test");
    expect(await execute("/lock test")).toEqual({
      message: "You have already locked `test` 🔒",
      destination: "user",
    });
  });
  test("cannot lock someone else's resource", async () => {
    await execute("/lock dev");
    expect(await execute("/lock dev", { user: "Dave" })).toEqual({
      message: "`dev` is already locked by <@Connor> 🔒",
      destination: "user",
    });
  });
  test("cannot lock without providing resource name", async () => {
    expect(await execute("/lock   ")).toEqual({
      message:
        "How to use `/lock`\n\n" +
        "To lock a resource in this channel called `thingy`, use `/lock thingy`\n\n" +
        "_Example:_\n" +
        `> *<@Connor>*: \`/lock dev\`\n` +
        `> *Lockbot*: <@Connor> has locked \`dev\` 🔒`,
      destination: "user",
    });
  });
  test("can get lock help", async () => {
    expect(await execute("/lock help")).toEqual({
      message:
        "How to use `/lock`\n\n" +
        "To lock a resource in this channel called `thingy`, use `/lock thingy`\n\n" +
        "_Example:_\n" +
        `> *<@Connor>*: \`/lock dev\`\n` +
        `> *Lockbot*: <@Connor> has locked \`dev\` 🔒`,
      destination: "user",
    });
  });
  test("unlock unlocked resource", async () => {
    expect(await execute("/unlock dev")).toEqual({
      message: "`dev` is already unlocked 🔓",
      destination: "user",
    });
  });
  test("can unlock resource", async () => {
    await execute("/lock dev");
    expect(await execute("/unlock dev")).toEqual({
      message: "<@Connor> has unlocked `dev` 🔓",
      destination: "channel",
    });
  });
  test("can unlock different resource", async () => {
    await execute("/lock test");
    expect(await execute("/unlock test")).toEqual({
      message: "<@Connor> has unlocked `test` 🔓",
      destination: "channel",
    });
  });
  test("cannot unlock resource with same name from a different channel", async () => {
    await execute("/lock dev");
    await execute("/unlock dev", { channel: "random" });
    expect(await execute("/locks")).toEqual({
      message:
        "Active locks in this channel:\n> `dev` is locked by <@Connor> 🔒" +
        " _<!date^1606153034^{date_pretty} {time}|Mon, 23 Nov 2020 17:37:14 GMT>_",
      destination: "user",
    });
  });
  test("cannot unlock someone else's resource", async () => {
    await execute("/lock test");
    expect(await execute("/unlock test", { user: "Dave" })).toEqual({
      message: "Cannot unlock `test`, locked by <@Connor> 🔒",
      destination: "user",
    });
  });
  test("cannot unlock someone else's resource (different user and resource)", async () => {
    await execute("/lock dev", { user: "Dave" });
    expect(await execute("/unlock dev")).toEqual({
      message: "Cannot unlock `dev`, locked by <@Dave> 🔒",
      destination: "user",
    });
  });
  test("can force unlock someone else's resource (different user and resource)", async () => {
    await execute("/lock dev", { user: "Dave" });
    expect(await execute("/unlock dev force")).toEqual({
      message:
        "<@Connor> has force unlocked `dev` 🔓 which was locked by <@Dave>",
      destination: "channel",
    });
  });
  test("can force unlock own resource", async () => {
    await execute("/lock dev");
    expect(await execute("/unlock dev force")).toEqual({
      message: "<@Connor> has unlocked `dev` 🔓",
      destination: "channel",
    });
  });
  test("cannot unlock without providing resource name", async () => {
    expect(await execute("/unlock   ")).toEqual({
      message:
        "How to use `/unlock`\n\n" +
        "To unlock a resource in this channel called `thingy`, use `/unlock thingy`\n\n" +
        "_Example:_\n" +
        `> *<@Connor>*: \`/unlock dev\`\n` +
        `> *Lockbot*: <@Connor> has unlocked \`dev\` 🔓\n\n` +
        "To force unlock a resource locked by someone else, use `/unlock thingy force`",
      destination: "user",
    });
  });
  test("can get unlock help", async () => {
    expect(await execute("/unlock help")).toEqual({
      message:
        "How to use `/unlock`\n\n" +
        "To unlock a resource in this channel called `thingy`, use `/unlock thingy`\n\n" +
        "_Example:_\n" +
        `> *<@Connor>*: \`/unlock dev\`\n` +
        `> *Lockbot*: <@Connor> has unlocked \`dev\` 🔓\n\n` +
        "To force unlock a resource locked by someone else, use `/unlock thingy force`",
      destination: "user",
    });
  });
  test("can lock, unlock and lock resource", async () => {
    await execute("/lock dev");
    await execute("/unlock dev");
    expect(await execute("/lock dev")).toEqual({
      message: "<@Connor> has locked `dev` 🔒",
      destination: "channel",
    });
  });
  test("can list locks when no locks", async () => {
    expect(await execute("/locks")).toEqual({
      message: "No active locks in this channel 🔓",
      destination: "user",
    });
  });
  test("can list locks one lock exists", async () => {
    await execute("/lock dev");
    expect(await execute("/locks")).toEqual({
      message:
        "Active locks in this channel:\n" +
        "> `dev` is locked by <@Connor> 🔒" +
        " _<!date^1606153034^{date_pretty} {time}|Mon, 23 Nov 2020 17:37:14 GMT>_",
      destination: "user",
    });
  });
  test("can list locks one lock exists different user", async () => {
    await execute("/lock dev", { user: "Dave" });
    expect(await execute("/locks")).toEqual({
      message:
        "Active locks in this channel:\n" +
        "> `dev` is locked by <@Dave> 🔒" +
        " _<!date^1606153034^{date_pretty} {time}|Mon, 23 Nov 2020 17:37:14 GMT>_",
      destination: "user",
    });
  });
  test("can list multiple locks", async () => {
    await execute("/lock dev");
    await execute("/lock test", { user: "Dave" });
    expect(await execute("/locks")).toEqual({
      message:
        "Active locks in this channel:\n" +
        "> `dev` is locked by <@Connor> 🔒" +
        " _<!date^1606153034^{date_pretty} {time}|Mon, 23 Nov 2020 17:37:14 GMT>_\n" +
        "> `test` is locked by <@Dave> 🔒" +
        " _<!date^1606153034^{date_pretty} {time}|Mon, 23 Nov 2020 17:37:14 GMT>_",
      destination: "user",
    });
  });
  test("cannot see locks in other channels", async () => {
    await execute("/lock dev");
    await execute("/lock test", { user: "Dave" });
    expect(await execute("/locks", { channel: "random" })).toEqual({
      message: "No active locks in this channel 🔓",
      destination: "user",
    });
  });
  test("cannot see locks in the same channel on another team", async () => {
    await execute("/lock dev");
    await execute("/lock test", { user: "Dave" });
    expect(await execute("/locks", { team: "another-team" })).toEqual({
      message: "No active locks in this channel 🔓",
      destination: "user",
    });
  });

  test("get access token help", async () => {
    expect(await execute("/lbtoken")).toEqual({
      message:
        "How to use `/lbtoken`\n\n" +
        "To generate a new access token for the Lockbot API use `/lbtoken new`\n\n" +
        "• The token is scoped to your user `Connor`, this team `our-team` and this channel `general`\n" +
        "• Make a note of your token as it won't be displayed again\n" +
        "• If you generate a new token in this channel it will invalidate the existing token for this channel\n\n" +
        "The API is secured using basic access authentication. To authenticate with the API you must set a header:\n" +
        "```Authorization: Basic <credentials>```\n" +
        "where `<credentials>` is `user:token` base64 encoded\n\n" +
        "Explore the Lockbot API with OpenAPI 3 and Swagger UI: https://lockbot.app/api-docs",
      destination: "user",
    });
  });

  test("get new access token", async () => {
    const { message, destination } = await execute("/lbtoken new");
    expect(destination).toBe("user");
    expect(message).toContain("Here is your new access token");
    expect(message).toContain("> Fetch all locks 📜\n");
    expect(message).toContain(
      "curl --request GET 'https://lockbot.app/api/teams/our-team/channels/general/locks'"
    );
    expect(message).toContain("> Fetch lock `dev` 👀\n");
    expect(message).toContain(
      "curl --request GET 'https://lockbot.app/api/teams/our-team/channels/general/locks/dev'"
    );
    expect(message).toContain("> Create lock `dev` 🔒\n");
    expect(message).toContain(
      "curl --request POST 'https://lockbot.app/api/teams/our-team/channels/general/locks'"
    );
    expect(message).toContain("> Delete lock `dev` 🔓\n");
    expect(message).toContain(
      "curl --request DELETE 'https://lockbot.app/api/teams/our-team/channels/general/locks/dev'"
    );
  });
};

describe("in memory lock repo", () => {
  beforeEach(() => {
    lockBot = new LockBot(
      new InMemoryLockRepo(),
      new TokenAuthorizer(new InMemoryAccessTokenRepo())
    );
  });
  runAllTests();
});

describe("dynamodb lock repo", () => {
  const resourcesTableName = "lock-bot-tests-resources";
  const accessTokenTableName = "lock-bot-tests-tokens";
  beforeEach(async () => {
    await recreateResourcesTable(resourcesTableName);
    await recreateAccessTokenTable(accessTokenTableName);
    const documentClient = new DocumentClient({
      region: "localhost",
      endpoint: "http://localhost:8000",
    });
    lockBot = new LockBot(
      new DynamoDBLockRepo(documentClient, resourcesTableName),
      new TokenAuthorizer(
        new DynamoDBAccessTokenRepo(documentClient, accessTokenTableName)
      )
    );
  });
  runAllTests();
});
