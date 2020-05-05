export default class LockBot {
  constructor(private readonly lockMap: Map<string, string>) {}

  lock = (resource: string, user: string): string => {
    if (!resource) {
      return "please provide the name of resource to lock e.g. '/lock dev'";
    }
    if (this.lockMap.has(resource)) {
      const lockOwner = this.lockMap.get(resource);
      if (user === lockOwner) {
        return `you have already locked ${resource}`;
      }
      return `${resource} is already locked by ${lockOwner}`;
    }
    this.lockMap.set(resource, user);
    return `you have locked ${resource}`;
  };

  unlock = (resource: string, user: string): string => {
    if (!resource) {
      return "please provide the name of resource to unlock e.g. '/unlock dev'";
    }
    if (!this.lockMap.has(resource)) {
      return `${resource} is already unlocked`;
    }
    const lockOwner = this.lockMap.get(resource);
    if (user === lockOwner) {
      this.lockMap.delete(resource);
      return `you have unlocked ${resource}`;
    }
    return `Cannot unlock ${resource}, locked by ${lockOwner}`;
  };

  locks = (): string => {
    if (this.lockMap.size === 0) {
      return "no active locks";
    }
    let locksMessage = "";
    this.lockMap.forEach((lockOwner, lockedResource) => {
      locksMessage += `${lockedResource} is locked by ${lockOwner}\n`;
    });
    return locksMessage.trimEnd();
  };
}
