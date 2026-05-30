import { DocumentClient } from "aws-sdk/clients/dynamodb";
import { InstallationStore } from "@slack/bolt";

// Extracted verbatim from infra.ts so the store can be exercised against
// DynamoDB Local without booting the whole Slack receiver (which requires every
// Slack env var and a live AWS client). Behaviour is unchanged.
const createInstallationStore = (
  documentClient: DocumentClient,
  installationsTableName: string
): InstallationStore => ({
  storeInstallation: async (installation, logger) => {
    if (installation.isEnterpriseInstall && installation.enterprise) {
      logger?.error("Enterprise storeInstallation attempt failed.");
      throw new Error("Enterprise installation not supported");
    } else if (installation.team) {
      await documentClient
        .put({
          TableName: installationsTableName,
          Item: {
            Team: installation.team.id,
            Installation: installation,
          },
        })
        .promise();
      const { team, user, bot } = installation;
      logger?.info("Installation stored.", {
        team,
        userId: user.id,
        botScopes: bot?.scopes,
      });
    } else {
      throw new Error("Failed to store installation");
    }
  },
  fetchInstallation: async (installQuery, logger) => {
    if (
      installQuery.isEnterpriseInstall &&
      installQuery.enterpriseId !== undefined
    ) {
      logger?.error("Enterprise fetchInstallation attempt failed.");
      throw new Error("Enterprise installation not supported");
    } else if (installQuery.teamId !== undefined) {
      const result = await documentClient
        .get({
          TableName: installationsTableName,
          Key: { Team: installQuery.teamId },
        })
        .promise();
      const installation = result.Item?.Installation;
      const { team, user, bot } = installation;
      logger?.info("Installation fetched.", {
        team,
        userId: user.id,
        botScopes: bot?.scopes,
      });
      return Promise.resolve(installation);
    } else {
      throw new Error("Failed to fetch installation");
    }
  },
});

export default createInstallationStore;
