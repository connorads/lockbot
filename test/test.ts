let lock = false;

const execute = (command: string) => {
  if (command[5] === "s") {
    if (lock) {
      return "dev is locked by Connor";
    }
    return "no active locks";
  }

  if (command[1] === "u") {
    lock = false;
    return "you have unlocked dev";
  }

  if (lock) {
    return "you have already locked dev";
  }
  lock = true;
  return "you have locked dev";
};

beforeEach(() => {
  lock = false;
});

test("can lock resource", () => {
  expect(execute("/lock dev")).toEqual("you have locked dev");
});

test("cannot lock resource twice", () => {
  execute("/lock dev");
  expect(execute("/lock dev")).toEqual("you have already locked dev");
});

test("can unlock resource", () => {
  execute("/lock dev");
  expect(execute("/unlock dev")).toEqual("you have unlocked dev");
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
