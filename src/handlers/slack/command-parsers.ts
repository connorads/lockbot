export const parseUnlock = (
  commandText: string | undefined
): { resource: string; force: boolean } => {
  const [resource = "", options] = (commandText ?? "").split(" ");
  return { resource, force: options === "force" };
};

export const getFirstParam = (commandText: string | undefined) =>
  (commandText ?? "").split(" ")[0] ?? "";
