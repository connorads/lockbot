import { DocumentClient } from "aws-sdk/clients/dynamodb";
import LockBot, { Response } from "../src/lock-bot";
import InMemoryLockRepo from "../src/storage/in-memory-lock-repo";
import DynamoDBLockRepo from "../src/storage/dynamodb-lock-repo";
import TokenAuthorizer from "../src/token-authorizer";
import InMemoryAccessTokenRepo from "../src/storage/in-memory-token-repo";
import DynamoDBAccessTokenRepo from "../src/storage/dynamodb-token-repo";
import { recreateResourcesTable } from "./utils";

let lockBot: LockBot;
const runAllTests = () => {
  const execute = async (
    input: string,
    params?: { user?: string; channel?: string; team?: string }
  ): Promise<Response> => {
    const tokens = input.split(" ");
    const command = tokens[0];
    const resource = tokens[1];
    const user = params?.user ?? "Connor";
    const channel = params?.channel ?? "general";
    const team = params?.team ?? "our-team";
    if (command === "/locks") {
      return lockBot.locks(channel, team);
    }
    if (command === "/unlock") {
      return lockBot.unlock(resource, user, channel, team);
    }
    if (command === "/lock") {
      return lockBot.lock(resource, user, channel, team);
    }
    if (command === "/lockbot") {
      return lockBot.lock(resource, user, channel, team);
    }
    throw Error("Unhandled command");
  };
  test("can lock resource", async () => {
    expect(await execute("/lock dev")).toEqual({
      message: "Connor has locked `dev` 🔒",
      destination: "channel",
    });
  });
  test("can lock different resource", async () => {
    expect(await execute("/lock test")).toEqual({
      message: "Connor has locked `test` 🔒",
      destination: "channel",
    });
  });
  test("can lock resource with same name in different channels", async () => {
    await execute("/lock dev");
    expect(await execute("/lock dev", { channel: "random" })).toEqual({
      message: "Connor has locked `dev` 🔒",
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
      message: "`dev` is already locked by Connor 🔒",
      destination: "user",
    });
  });
  test("cannot lock without providing resource name", async () => {
    expect(await execute("/lock   ")).toEqual({
      message:
        "How to use `/lock`\n\n" +
        "To lock a resource in this channel called `thingy`, use `/lock thingy`\n\n" +
        "_Example:_\n" +
        `> *Connor*: \`/lock dev\`\n` +
        `> *Lockbot*: Connor has locked \`dev\` 🔒`,
      destination: "user",
    });
  });
  test("can get lock help", async () => {
    expect(await execute("/lock help")).toEqual({
      message:
        "How to use `/lock`\n\n" +
        "To lock a resource in this channel called `thingy`, use `/lock thingy`\n\n" +
        "_Example:_\n" +
        `> *Connor*: \`/lock dev\`\n` +
        `> *Lockbot*: Connor has locked \`dev\` 🔒`,
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
      message: "Connor has unlocked `dev` 🔓",
      destination: "channel",
    });
  });
  test("can unlock different resource", async () => {
    await execute("/lock test");
    expect(await execute("/unlock test")).toEqual({
      message: "Connor has unlocked `test` 🔓",
      destination: "channel",
    });
  });
  test("cannot unlock resource with same name from a different channel", async () => {
    await execute("/lock dev");
    await execute("/unlock dev", { channel: "random" });
    expect(await execute("/locks")).toEqual({
      message: "Active locks in this channel:\n> `dev` is locked by Connor 🔒",
      destination: "user",
    });
  });
  test("cannot unlock someone else's resource", async () => {
    await execute("/lock test");
    expect(await execute("/unlock test", { user: "Dave" })).toEqual({
      message: "Cannot unlock `test`, locked by Connor 🔒",
      destination: "user",
    });
  });
  test("cannot unlock someone else's resource (different user and resource)", async () => {
    await execute("/lock dev", { user: "Dave" });
    expect(await execute("/unlock dev")).toEqual({
      message: "Cannot unlock `dev`, locked by Dave 🔒",
      destination: "user",
    });
  });
  test("cannot unlock without providing resource name", async () => {
    expect(await execute("/unlock   ")).toEqual({
      message:
        "How to use `/unlock`\n\n" +
        "To unlock a resource in this channel called `thingy`, use `/unlock thingy`\n\n" +
        "_Example:_\n" +
        `> *Connor*: \`/unlock dev\`\n` +
        `> *Lockbot*: Connor has unlocked \`dev\` 🔓`,
      destination: "user",
    });
  });
  test("can get unlock help", async () => {
    expect(await execute("/unlock help")).toEqual({
      message:
        "How to use `/unlock`\n\n" +
        "To unlock a resource in this channel called `thingy`, use `/unlock thingy`\n\n" +
        "_Example:_\n" +
        `> *Connor*: \`/unlock dev\`\n` +
        `> *Lockbot*: Connor has unlocked \`dev\` 🔓`,
      destination: "user",
    });
  });
  test("can lock, unlock and lock resource", async () => {
    await execute("/lock dev");
    await execute("/unlock dev");
    expect(await execute("/lock dev")).toEqual({
      message: "Connor has locked `dev` 🔒",
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
      message: "Active locks in this channel:\n> `dev` is locked by Connor 🔒",
      destination: "user",
    });
  });
  test("can list locks one lock exists different user", async () => {
    await execute("/lock dev", { user: "Dave" });
    expect(await execute("/locks")).toEqual({
      message: "Active locks in this channel:\n> `dev` is locked by Dave 🔒",
      destination: "user",
    });
  });
  test("can list multiple locks", async () => {
    await execute("/lock dev");
    await execute("/lock test", { user: "Dave" });
    expect(await execute("/locks")).toEqual({
      message:
        "Active locks in this channel:\n> `dev` is locked by Connor 🔒\n> `test` is locked by Dave 🔒",
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
  test("get new access token", async () => {
    await execute("/lockbot token");
    // assert text
    // assert token? maybe? not sure?
  });

  test("replace existing access token", async () => {
    await execute("/lockbot dev");
    // assert text
    // assert text
    // assert token is different
  });

  test("get access token help", async () => {
    await execute("/lockbot dev");
    // assert text
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
