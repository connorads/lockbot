import DynamoDB, { DocumentClient } from "aws-sdk/clients/dynamodb";
import LockBot, { Response } from "../src/lock-bot";
import InMemoryLockRepo from "../src/in-memory-lock-repo";
import DynamoDBLockRepo from "../src/dynamodb-lock-repo";

let lockBot: LockBot;
const runAllTests = () => {
  const execute = async (input: string, user = "Connor"): Promise<Response> => {
    const tokens = input.split(" ");
    const command = tokens[0];
    const resource = tokens[1];
    if (command === "/locks") {
      return lockBot.locks();
    }
    if (command === "/unlock") {
      return lockBot.unlock(resource, user);
    }
    if (command === "/lock") {
      return lockBot.lock(resource, user);
    }
    throw Error("Unhandled command");
  };
  test("can lock resource", async () => {
    expect(await execute("/lock dev")).toEqual({
      message: "Connor has locked dev 🔒",
      destination: "channel",
    });
  });
  test("can lock different resource", async () => {
    expect(await execute("/lock test")).toEqual({
      message: "Connor has locked test 🔒",
      destination: "channel",
    });
  });
  test("cannot lock resource twice", async () => {
    await execute("/lock dev");
    expect(await execute("/lock dev")).toEqual({
      message: "You have already locked dev 🔒",
      destination: "user",
    });
  });
  test("cannot lock different resource twice", async () => {
    await execute("/lock test");
    expect(await execute("/lock test")).toEqual({
      message: "You have already locked test 🔒",
      destination: "user",
    });
  });
  test("cannot lock someone else's resource", async () => {
    await execute("/lock dev");
    expect(await execute("/lock dev", "Dave")).toEqual({
      message: "dev is already locked by Connor 🔒",
      destination: "user",
    });
  });
  test("cannot lock without providing resource name", async () => {
    expect(await execute("/lock   ")).toEqual({
      message: "Please provide the name of resource to lock e.g. '/lock dev'",
      destination: "user",
    });
  });
  test("unlock unlocked resource", async () => {
    expect(await execute("/unlock dev")).toEqual({
      message: "dev is already unlocked 🔓",
      destination: "user",
    });
  });
  test("can unlock resource", async () => {
    await execute("/lock dev");
    expect(await execute("/unlock dev")).toEqual({
      message: "Connor has unlocked dev 🔓",
      destination: "channel",
    });
  });
  test("can unlock different resource", async () => {
    await execute("/lock test");
    expect(await execute("/unlock test")).toEqual({
      message: "Connor has unlocked test 🔓",
      destination: "channel",
    });
  });
  test("cannot unlock someone else's resource", async () => {
    await execute("/lock test");
    expect(await execute("/unlock test", "Dave")).toEqual({
      message: "Cannot unlock test, locked by Connor 🔒",
      destination: "user",
    });
  });
  test("cannot unlock someone else's resource (different user and resource)", async () => {
    await execute("/lock dev", "Dave");
    expect(await execute("/unlock dev")).toEqual({
      message: "Cannot unlock dev, locked by Dave 🔒",
      destination: "user",
    });
  });
  test("cannot unlock without providing resource name", async () => {
    expect(await execute("/unlock   ")).toEqual({
      message:
        "Please provide the name of resource to unlock e.g. '/unlock dev'",
      destination: "user",
    });
  });
  test("can lock, unlock and lock resource", async () => {
    await execute("/lock dev");
    await execute("/unlock dev");
    expect(await execute("/lock dev")).toEqual({
      message: "Connor has locked dev 🔒",
      destination: "channel",
    });
  });
  test("can list locks when no locks", async () => {
    expect(await execute("/locks")).toEqual({
      message: "No active locks 🔓",
      destination: "user",
    });
  });
  test("can list locks one lock exists", async () => {
    await execute("/lock dev");
    expect(await execute("/locks")).toEqual({
      message: "dev is locked by Connor 🔒",
      destination: "user",
    });
  });
  test("can list locks one lock exists different user", async () => {
    await execute("/lock dev", "Dave");
    expect(await execute("/locks")).toEqual({
      message: "dev is locked by Dave 🔒",
      destination: "user",
    });
  });
  test("can list multiple locks", async () => {
    await execute("/lock dev");
    await execute("/lock test", "Dave");
    expect(await execute("/locks")).toEqual({
      message: "dev is locked by Connor 🔒\ntest is locked by Dave 🔒",
      destination: "user",
    });
  });
};

describe("in memory lock repo", () => {
  beforeEach(async () => {
    lockBot = new LockBot(new InMemoryLockRepo());
  });
  runAllTests();
});

describe("dynamodb lock repo", () => {
  beforeEach(async () => {
    const options = {
      region: "localhost",
      endpoint: "http://localhost:8000",
    };
    const db = new DynamoDB(options);
    try {
      await db.deleteTable({ TableName: "Resources" }).promise();
    } catch (error) {
      // No problem if the table doesn't exist
    } finally {
      await db
        .createTable({
          TableName: "Resources",
          AttributeDefinitions: [{ AttributeName: "Name", AttributeType: "S" }],
          KeySchema: [{ AttributeName: "Name", KeyType: "HASH" }],
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1,
          },
        })
        .promise();
    }
    lockBot = new LockBot(new DynamoDBLockRepo(new DocumentClient(options)));
  });
  runAllTests();
});
