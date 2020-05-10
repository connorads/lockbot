import { LockRepo } from "./lock-bot";

export default class InMemoryLockRepo implements LockRepo {
  private readonly lockMap: Map<string, string> = new Map();

  clear(): void {
    this.lockMap.clear();
  }

  delete(resource: string): void {
    this.lockMap.delete(resource);
  }

  getAll(): Map<string, string> {
    return this.lockMap;
  }

  getOwner(resource: string): string | undefined {
    return this.lockMap.get(resource);
  }

  setOwner(resource: string, owner: string): void {
    this.lockMap.set(resource, owner);
  }

  get size() {
    return this.lockMap.size;
  }
}
