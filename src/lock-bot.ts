export interface LockRepo {
  delete(resource: string): Promise<void>;
  getAll(): Promise<Map<string, string>>;
  getOwner(resource: string): Promise<string | undefined>;
  setOwner(resource: string, owner: string): Promise<void>;
}

export type Destination = "user" | "channel";

export interface Response {
  message: string;
  destination: Destination;
}

export default class LockBot {
  constructor(private readonly lockRepo: LockRepo) {}

  lock = async (resource: string, user: string): Promise<Response> => {
    if (!resource) {
      return {
        message: "Please provide the name of resource to lock e.g. '/lock dev'",
        destination: "user",
      };
    }
    const lockOwner = await this.lockRepo.getOwner(resource);
    if (lockOwner) {
      if (user === lockOwner) {
        return {
          message: `You have already locked ${resource} 🔒`,
          destination: "user",
        };
      }
      return {
        message: `${resource} is already locked by ${lockOwner} 🔒`,
        destination: "user",
      };
    }
    await this.lockRepo.setOwner(resource, user);
    return {
      message: `${user} has locked ${resource} 🔒`,
      destination: "channel",
    };
  };

  unlock = async (resource: string, user: string): Promise<Response> => {
    if (!resource) {
      return {
        message:
          "Please provide the name of resource to unlock e.g. '/unlock dev'",
        destination: "user",
      };
    }
    const lockOwner = await this.lockRepo.getOwner(resource);
    if (!lockOwner) {
      return {
        message: `${resource} is already unlocked 🔓`,
        destination: "user",
      };
    }

    if (user === lockOwner) {
      await this.lockRepo.delete(resource);
      return {
        message: `${user} has unlocked ${resource} 🔓`,
        destination: "channel",
      };
    }
    return {
      message: `Cannot unlock ${resource}, locked by ${lockOwner} 🔒`,
      destination: "user",
    };
  };

  locks = async (): Promise<Response> => {
    const locks = await this.lockRepo.getAll();
    if (locks.size === 0) {
      return { message: "No active locks 🔓", destination: "user" };
    }
    let locksMessage = "";
    locks.forEach((lockOwner, lockedResource) => {
      locksMessage += `${lockedResource} is locked by ${lockOwner} 🔒\n`;
    });
    return { message: locksMessage.trimRight(), destination: "user" };
  };
}
