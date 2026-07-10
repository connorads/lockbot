import type { LockRepo } from "../lock-bot";

export default class InMemoryLockRepo implements LockRepo {
  private readonly lockMap: Map<string, { owner: string; created: Date }> =
    new Map();

  private static readonly separator = "🎱🈂️💟🍐🍚🕕😽🎉⛎4️⃣";

  private static toKey = (resource: string, channel: string, team: string) => {
    return `${channel}${InMemoryLockRepo.separator}${resource}${InMemoryLockRepo.separator}${team}`;
  };

  private static fromKey = (key: string) => {
    const [channel = "", resource = "", team = ""] = key.split(
      InMemoryLockRepo.separator
    );
    return { resource, channel, team };
  };

  async delete(resource: string, channel: string, team: string): Promise<void> {
    this.lockMap.delete(InMemoryLockRepo.toKey(resource, channel, team));
  }

  async getAll(
    channel: string,
    team: string
  ): Promise<Map<string, { owner: string; created: Date }>> {
    const all = new Map<string, { owner: string; created: Date }>();
    this.lockMap.forEach((value, key) => {
      const {
        resource,
        channel: resourceChannel,
        team: resourceTeam,
      } = InMemoryLockRepo.fromKey(key);
      if (resourceTeam === team && resourceChannel === channel) {
        all.set(resource, value);
      }
    });
    return all;
  }

  async getOwner(
    resource: string,
    channel: string,
    team: string
  ): Promise<string | undefined> {
    return this.lockMap.get(InMemoryLockRepo.toKey(resource, channel, team))
      ?.owner;
  }

  async setOwner(
    resource: string,
    owner: string,
    channel: string,
    team: string
  ): Promise<void> {
    this.lockMap.set(InMemoryLockRepo.toKey(resource, channel, team), {
      owner,
      created: new Date(),
    });
  }
}
