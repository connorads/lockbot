import { LockRepo } from "./lock-bot";

export default class InMemoryLockRepo implements LockRepo {
  private readonly lockMap: Map<string, string> = new Map();

  private static readonly separator = "🎱🈂️💟🍐🍚🕕😽🎉⛎4️⃣";

  private static toKey = (resource: string, channel: string) => {
    return `${channel}${InMemoryLockRepo.separator}${resource}`;
  };

  private static fromKey = (key: string) => {
    const strings = key.split(InMemoryLockRepo.separator);
    const channel = strings[0];
    const resource = strings[1];
    return { resource, channel };
  };

  async delete(resource: string, channel: string): Promise<void> {
    this.lockMap.delete(InMemoryLockRepo.toKey(resource, channel));
  }

  async getAll(channel: string): Promise<Map<string, string>> {
    const all: Map<string, string> = new Map();
    this.lockMap.forEach((value, key) => {
      const { resource, channel: resourceChannel } = InMemoryLockRepo.fromKey(
        key
      );
      if (resourceChannel === channel) {
        all.set(resource, value);
      }
    });
    return all;
  }

  async getOwner(
    resource: string,
    channel: string
  ): Promise<string | undefined> {
    return this.lockMap.get(InMemoryLockRepo.toKey(resource, channel));
  }

  async setOwner(
    resource: string,
    channel: string,
    owner: string
  ): Promise<void> {
    this.lockMap.set(InMemoryLockRepo.toKey(resource, channel), owner);
  }
}
