const locks: Set<string> = new Set();

const execute = (command: string) => {
  const resource = command.split(" ")[1];

  if (command[5] === "s") {
    if (locks.size === 0) {
      return "no active locks";
    }

    let locksMessage = "";
    locks.forEach((_, res) => {
      locksMessage += `${res} is locked by Connor\n`;
    });
    return locksMessage.trimEnd();
  }

  if (command[1] === "u" && resource) {
    locks.delete(resource);
    return `you have unlocked ${resource}`;
  }

  if (locks.has(resource)) {
    return `you have already locked ${resource}`;
  }

  locks.add(resource);
  return `you have locked ${resource}`;
};

beforeEach(() => {
  locks.clear();
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

test("can unlock resource", () => {
  execute("/lock dev");
  expect(execute("/unlock dev")).toEqual("you have unlocked dev");
});
test("can unlock different resource", () => {
  execute("/lock test");
  expect(execute("/unlock test")).toEqual("you have unlocked test");
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

test("can list locks multiple locks", () => {
  execute("/lock dev");
  execute("/lock test");
  expect(execute("/locks")).toEqual(
    "dev is locked by Connor\ntest is locked by Connor"
  );
});
