export interface LockRepo {
  clear(): void;
  delete(resource: string): void;
  getAll(): Map<string, string>;
  getOwner(resource: string): string | undefined;
  setOwner(resource: string, owner: string): void;
  size: number;
}

export default class LockBot {
  constructor(private readonly lockRepo: LockRepo) {}

  lock = (resource: string, user: string): string => {
    if (!resource) {
      return "please provide the name of resource to lock e.g. '/lock dev'";
    }
    const lockOwner = this.lockRepo.getOwner(resource);
    if (lockOwner) {
      if (user === lockOwner) {
        return `you have already locked ${resource}`;
      }
      return `${resource} is already locked by ${lockOwner}`;
    }
    this.lockRepo.setOwner(resource, user);
    return `you have locked ${resource}`;
  };

  unlock = (resource: string, user: string): string => {
    if (!resource) {
      return "please provide the name of resource to unlock e.g. '/unlock dev'";
    }
    const lockOwner = this.lockRepo.getOwner(resource);
    if (!lockOwner) {
      return `${resource} is already unlocked`;
    }

    if (user === lockOwner) {
      this.lockRepo.delete(resource);
      return `you have unlocked ${resource}`;
    }
    return `Cannot unlock ${resource}, locked by ${lockOwner}`;
  };

  locks = (): string => {
    if (this.lockRepo.size === 0) {
      return "no active locks";
    }
    let locksMessage = "";
    this.lockRepo.getAll().forEach((lockOwner, lockedResource) => {
      locksMessage += `${lockedResource} is locked by ${lockOwner}\n`;
    });
    return locksMessage.trimEnd();
  };
}
