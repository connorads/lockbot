export const parseUnlock = (
  commandText: string,
): { resource: string; force: boolean } => {
  const [resource, options] = commandText.split(" ");
  return { resource, force: options === "force" };
};

export const getFirstParam = (commandText: string) => commandText.split(" ")[0];

export interface LockParams {
  resource: string;
  expiry?: string;
}

/**
 * Parse lock command with optional expiry.
 * Examples:
 *   "/lock dev" -> { resource: "dev" }
 *   "/lock dev --expiry 2h" -> { resource: "dev", expiry: "2h" }
 */
export const parseLock = (commandText: string): LockParams => {
  const parts = commandText.trim().split(/\s+/);
  const resource = parts[0] || "";

  const expiryIndex = parts.findIndex(
    (p) => p === "--expiry" || p === "-e" || p === "--expires",
  );
  const expiry =
    expiryIndex !== -1 && parts[expiryIndex + 1]
      ? parts[expiryIndex + 1]
      : undefined;

  return { resource, expiry };
};

/**
 * Parse space-separated list of resources.
 * Example: "dev staging prod" -> ["dev", "staging", "prod"]
 */
export const parseResourceList = (commandText: string): string[] => {
  return commandText
    .trim()
    .split(/\s+/)
    .filter((r) => r.length > 0);
};
