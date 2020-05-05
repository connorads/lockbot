import LockBot from "../src/lock-bot";

let lockBot: LockBot;

const execute = (input: string, user = "Connor"): string => {
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

  throw new Error("Unhandled command");
};

beforeEach(() => {
  lockBot = new LockBot(new Map());
});

test("can lock resource", () => {
  expect(execute("/lock dev")).toEqual("you have locked dev");
});
test("can lock different resource", () => {
  expect(execute("/lock test")).toEqual("you have locked test");
});

test("cannot lock resource twice", () => {
  execute("/lock dev");
  expect(execute("/lock dev")).toEqual("you have already locked dev");
});
test("cannot lock different resource twice", () => {
  execute("/lock test");
  expect(execute("/lock test")).toEqual("you have already locked test");
});

test("cannot lock someone else's resource", () => {
  execute("/lock dev");
  expect(execute("/lock dev", "Dave")).toEqual(
    "dev is already locked by Connor"
  );
});

test("cannot lock without providing resource name", () => {
  expect(execute("/lock   ")).toEqual(
    "please provide the name of resource to lock e.g. '/lock dev'"
  );
});

test("unlock unlocked resource", () => {
  expect(execute("/unlock dev")).toEqual("dev is already unlocked");
});

test("can unlock resource", () => {
  execute("/lock dev");
  expect(execute("/unlock dev")).toEqual("you have unlocked dev");
});
test("can unlock different resource", () => {
  execute("/lock test");
  expect(execute("/unlock test")).toEqual("you have unlocked test");
});

test("cannot unlock someone else's resource", () => {
  execute("/lock test");
  expect(execute("/unlock test", "Dave")).toEqual(
    "Cannot unlock test, locked by Connor"
  );
});
test("cannot unlock someone else's resource (different user and resource)", () => {
  execute("/lock dev", "Dave");
  expect(execute("/unlock dev")).toEqual("Cannot unlock dev, locked by Dave");
});

test("cannot unlock without providing resource name", () => {
  expect(execute("/unlock   ")).toEqual(
    "please provide the name of resource to unlock e.g. '/unlock dev'"
  );
});

test("can lock, unlock and lock resource", () => {
  execute("/lock dev");
  execute("/unlock dev");
  expect(execute("/lock dev")).toEqual("you have locked dev");
});

test("can list locks when no locks", () => {
  expect(execute("/locks")).toEqual("no active locks");
});

test("can list locks one lock exists", () => {
  execute("/lock dev");
  expect(execute("/locks")).toEqual("dev is locked by Connor");
});

test("can list locks one lock exists different user", () => {
  execute("/lock dev", "Dave");
  expect(execute("/locks")).toEqual("dev is locked by Dave");
});

test("can list multiple locks", () => {
  execute("/lock dev");
  execute("/lock test", "Dave");
  expect(execute("/locks")).toEqual(
    "dev is locked by Connor\ntest is locked by Dave"
  );
});
