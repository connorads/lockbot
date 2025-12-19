export type LockMode = "strict" | "flexible";

export interface ChannelConfig {
  resources: Set<string>;
  lockMode: LockMode;
  defaultExpiry: number; // seconds, 0 = no expiry
}

export interface ChannelConfigRepo {
  getConfig(channel: string, team: string): Promise<ChannelConfig | undefined>;
  addResources(
    channel: string,
    team: string,
    resources: string[],
  ): Promise<void>;
  removeResources(
    channel: string,
    team: string,
    resources: string[],
  ): Promise<void>;
  setLockMode(channel: string, team: string, mode: LockMode): Promise<void>;
  setDefaultExpiry(
    channel: string,
    team: string,
    seconds: number,
  ): Promise<void>;
}
