import LockBot from "../src/lock-bot";
import InMemoryLockRepo from "../src/in-memory-lock-repo";

let lockBot: LockBot;

const execute = async (input: string, user = "Connor"): Promise<string> => {
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

  return "Unhandled command";
};

beforeEach(() => {
  lockBot = new LockBot(new InMemoryLockRepo());
});

test("can lock resource", async () => {
  expect(await execute("/lock dev")).toEqual("you have locked dev");
});
test("can lock different resource", async () => {
  expect(await execute("/lock test")).toEqual("you have locked test");
});

test("cannot lock resource twice", async () => {
  await execute("/lock dev");
  expect(await execute("/lock dev")).toEqual("you have already locked dev");
});
test("cannot lock different resource twice", async () => {
  await execute("/lock test");
  expect(await execute("/lock test")).toEqual("you have already locked test");
});

test("cannot lock someone else's resource", async () => {
  await execute("/lock dev");
  expect(await execute("/lock dev", "Dave")).toEqual(
    "dev is already locked by Connor"
  );
});

test("cannot lock without providing resource name", async () => {
  expect(await execute("/lock   ")).toEqual(
    "please provide the name of resource to lock e.g. '/lock dev'"
  );
});

test("unlock unlocked resource", async () => {
  expect(await execute("/unlock dev")).toEqual("dev is already unlocked");
});

test("can unlock resource", async () => {
  await execute("/lock dev");
  expect(await execute("/unlock dev")).toEqual("you have unlocked dev");
});
test("can unlock different resource", async () => {
  await execute("/lock test");
  expect(await execute("/unlock test")).toEqual("you have unlocked test");
});

test("cannot unlock someone else's resource", async () => {
  await execute("/lock test");
  expect(await execute("/unlock test", "Dave")).toEqual(
    "Cannot unlock test, locked by Connor"
  );
});
test("cannot unlock someone else's resource (different user and resource)", async () => {
  await execute("/lock dev", "Dave");
  expect(await execute("/unlock dev")).toEqual(
    "Cannot unlock dev, locked by Dave"
  );
});

test("cannot unlock without providing resource name", async () => {
  expect(await execute("/unlock   ")).toEqual(
    "please provide the name of resource to unlock e.g. '/unlock dev'"
  );
});

test("can lock, unlock and lock resource", async () => {
  await execute("/lock dev");
  await execute("/unlock dev");
  expect(await execute("/lock dev")).toEqual("you have locked dev");
});

test("can list locks when no locks", async () => {
  expect(await execute("/locks")).toEqual("no active locks");
});

test("can list locks one lock exists", async () => {
  await execute("/lock dev");
  expect(await execute("/locks")).toEqual("dev is locked by Connor");
});

test("can list locks one lock exists different user", async () => {
  await execute("/lock dev", "Dave");
  expect(await execute("/locks")).toEqual("dev is locked by Dave");
});

test("can list multiple locks", async () => {
  await execute("/lock dev");
  await execute("/lock test", "Dave");
  expect(await execute("/locks")).toEqual(
    "dev is locked by Connor\ntest is locked by Dave"
  );
});
