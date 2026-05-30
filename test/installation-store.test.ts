import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { Installation, InstallationQuery } from "@slack/bolt";
import createInstallationStore from "../src/handlers/slack/installation-store";
import { recreateInstallationsTable } from "./utils";

const installationsTableName = "dev-lockbot-installations";

const aTeamInstallation = (): Installation<"v2", false> => ({
  team: { id: "T012345WXYZ", name: "our-team" },
  enterprise: undefined,
  user: { id: "U012345MNOP", token: undefined, scopes: undefined },
  bot: {
    token: "xoxb-fake-bot-token",
    scopes: ["commands"],
    id: "B012345BOT0",
    userId: "U012345BOT0",
  },
  isEnterpriseInstall: false,
});

describe("DynamoDB installation store", () => {
  let store: ReturnType<typeof createInstallationStore>;
  beforeEach(async () => {
    await recreateInstallationsTable(installationsTableName);
    store = createInstallationStore(
      new DocumentClient({
        region: "localhost",
        endpoint: "http://localhost:8000",
      }),
      installationsTableName
    );
  });

  test("stores an installation and fetches it back by team", async () => {
    const installation = aTeamInstallation();
    await store.storeInstallation(installation);

    const query: InstallationQuery<false> = {
      teamId: "T012345WXYZ",
      enterpriseId: undefined,
      isEnterpriseInstall: false,
    };
    expect(await store.fetchInstallation(query)).toEqual(installation);
  });

  test("rejects storing an enterprise installation", async () => {
    const enterpriseInstallation: Installation<"v2", true> = {
      team: undefined,
      enterprise: { id: "E012345ENT0", name: "big-corp" },
      user: { id: "U012345MNOP", token: undefined, scopes: undefined },
      isEnterpriseInstall: true,
    };
    await expect(
      store.storeInstallation(enterpriseInstallation)
    ).rejects.toThrow("Enterprise installation not supported");
  });

  test("rejects fetching an enterprise installation", async () => {
    const query: InstallationQuery<true> = {
      teamId: undefined,
      enterpriseId: "E012345ENT0",
      isEnterpriseInstall: true,
    };
    await expect(store.fetchInstallation(query)).rejects.toThrow(
      "Enterprise installation not supported"
    );
  });

  test("throws when fetching a team with no stored installation", async () => {
    const query: InstallationQuery<false> = {
      teamId: "T999999NONE",
      enterpriseId: undefined,
      isEnterpriseInstall: false,
    };
    // Current behaviour: fetchInstallation destructures the (undefined) result,
    // so an unknown team throws rather than returning undefined. Pinned here so
    // the AWS SDK v3 migration has to consciously decide whether to keep it.
    await expect(store.fetchInstallation(query)).rejects.toThrow();
  });
});
