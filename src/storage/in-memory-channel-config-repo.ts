import {
  ChannelConfig,
  ChannelConfigRepo,
  LockMode,
} from "./channel-config-repo";

export default class InMemoryChannelConfigRepo implements ChannelConfigRepo {
  private readonly configMap: Map<string, ChannelConfig> = new Map();

  private static toKey = (channel: string, team: string) =>
    `${team}#${channel}`;

  async getConfig(
    channel: string,
    team: string,
  ): Promise<ChannelConfig | undefined> {
    return this.configMap.get(InMemoryChannelConfigRepo.toKey(channel, team));
  }

  async addResources(
    channel: string,
    team: string,
    resources: string[],
  ): Promise<void> {
    const key = InMemoryChannelConfigRepo.toKey(channel, team);
    const existing = this.configMap.get(key);
    if (existing) {
      resources.forEach((r) => existing.resources.add(r));
    } else {
      this.configMap.set(key, {
        resources: new Set(resources),
        lockMode: "flexible",
        defaultExpiry: 0,
      });
    }
  }

  async removeResources(
    channel: string,
    team: string,
    resources: string[],
  ): Promise<void> {
    const key = InMemoryChannelConfigRepo.toKey(channel, team);
    const existing = this.configMap.get(key);
    if (existing) {
      resources.forEach((r) => existing.resources.delete(r));
    }
  }

  async setLockMode(
    channel: string,
    team: string,
    mode: LockMode,
  ): Promise<void> {
    const key = InMemoryChannelConfigRepo.toKey(channel, team);
    const existing = this.configMap.get(key);
    if (existing) {
      existing.lockMode = mode;
    } else {
      this.configMap.set(key, {
        resources: new Set(),
        lockMode: mode,
        defaultExpiry: 0,
      });
    }
  }

  async setDefaultExpiry(
    channel: string,
    team: string,
    seconds: number,
  ): Promise<void> {
    const key = InMemoryChannelConfigRepo.toKey(channel, team);
    const existing = this.configMap.get(key);
    if (existing) {
      existing.defaultExpiry = seconds;
    } else {
      this.configMap.set(key, {
        resources: new Set(),
        lockMode: "flexible",
        defaultExpiry: seconds,
      });
    }
  }
}
