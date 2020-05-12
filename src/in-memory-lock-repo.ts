import { LockRepo } from "./lock-bot";

export default class InMemoryLockRepo implements LockRepo {
  private readonly lockMap: Map<string, string> = new Map();

  async delete(resource: string): Promise<void> {
    this.lockMap.delete(resource);
  }

  async getAll(): Promise<Map<string, string>> {
    return this.lockMap;
  }

  async getOwner(resource: string): Promise<string | undefined> {
    return this.lockMap.get(resource);
  }

  async setOwner(resource: string, owner: string): Promise<void> {
    this.lockMap.set(resource, owner);
  }
}
