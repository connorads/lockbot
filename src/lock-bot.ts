export interface LockRepo {
  delete(resource: string): Promise<void>;
  getAll(): Promise<Map<string, string>>;
  getOwner(resource: string): Promise<string | undefined>;
  setOwner(resource: string, owner: string): Promise<void>;
}

export default class LockBot {
  constructor(private readonly lockRepo: LockRepo) {}

  lock = async (resource: string, user: string): Promise<string> => {
    if (!resource) {
      return "please provide the name of resource to lock e.g. '/lock dev'";
    }
    const lockOwner = await this.lockRepo.getOwner(resource);
    if (lockOwner) {
      if (user === lockOwner) {
        return `you have already locked ${resource}`;
      }
      return `${resource} is already locked by ${lockOwner}`;
    }
    await this.lockRepo.setOwner(resource, user);
    return `you have locked ${resource}`;
  };

  unlock = async (resource: string, user: string): Promise<string> => {
    if (!resource) {
      return "please provide the name of resource to unlock e.g. '/unlock dev'";
    }
    const lockOwner = await this.lockRepo.getOwner(resource);
    if (!lockOwner) {
      return `${resource} is already unlocked`;
    }

    if (user === lockOwner) {
      await this.lockRepo.delete(resource);
      return `you have unlocked ${resource}`;
    }
    return `Cannot unlock ${resource}, locked by ${lockOwner}`;
  };

  locks = async (): Promise<string> => {
    const locks = await this.lockRepo.getAll();
    if (locks.size === 0) {
      return "no active locks";
    }
    let locksMessage = "";
    locks.forEach((lockOwner, lockedResource) => {
      locksMessage += `${lockedResource} is locked by ${lockOwner}\n`;
    });
    return locksMessage.trimRight();
  };
}
