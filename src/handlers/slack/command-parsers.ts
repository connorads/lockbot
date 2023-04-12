export const parseUnlock = (
  commandText: string
): { resource: string; force: boolean } => {
  const [resource, options] = commandText.split(" ");
  return { resource, force: options === "force" };
};

export const getFirstParam = (commandText: string) => commandText.split(" ")[0];
export const getSecondParam = (commandText: string) =>
  commandText.split(" ").slice(1).join(" ");
