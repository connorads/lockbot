import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  DeleteCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { WebClient } from "@slack/web-api";
import * as env from "env-var";

interface ExpiredLock {
  resource: string;
  group: string;
  owner: string;
  expiresAt: number;
  metadata?: {
    Channel?: string;
    Team?: string;
  };
}

interface Installation {
  bot?: {
    token?: string;
  };
}

const client = new DynamoDBClient({});
const documentClient = DynamoDBDocumentClient.from(client);

const resourcesTableName = env
  .get("RESOURCES_TABLE_NAME")
  .required()
  .asString();

const installationsTableName = env
  .get("INSTALLATIONS_TABLE_NAME")
  .required()
  .asString();

async function getExpiredLocks(): Promise<ExpiredLock[]> {
  const now = Math.floor(Date.now() / 1000);
  // Query for locks expiring in the next 2 minutes (for buffer)
  const twoMinutesFromNow = now + 120;

  const result = await documentClient.send(
    new ScanCommand({
      TableName: resourcesTableName,
      FilterExpression:
        "attribute_exists(ExpiresAt) AND ExpiresAt <= :expiry AND ExpiresAt > :zero",
      ExpressionAttributeValues: {
        ":expiry": twoMinutesFromNow,
        ":zero": 0,
      },
    }),
  );

  if (!result.Items) {
    return [];
  }

  return result.Items.filter((item) => {
    const expiresAt = item.ExpiresAt as number;
    // Only return locks that have actually expired (not just about to expire)
    return expiresAt <= now;
  }).map((item) => ({
    resource: item.Resource as string,
    group: item.Group as string,
    owner: item.Owner as string,
    expiresAt: item.ExpiresAt as number,
    metadata: item.Metadata as ExpiredLock["metadata"],
  }));
}

async function getSlackToken(teamId: string): Promise<string | undefined> {
  const result = await documentClient.send(
    new GetCommand({
      TableName: installationsTableName,
      Key: { Team: teamId },
    }),
  );

  const installation = result.Item?.Installation as Installation | undefined;
  return installation?.bot?.token;
}

async function deleteLock(resource: string, group: string): Promise<void> {
  await documentClient.send(
    new DeleteCommand({
      TableName: resourcesTableName,
      Key: { Resource: resource, Group: group },
    }),
  );
}

async function notifyAndDeleteLock(lock: ExpiredLock): Promise<void> {
  // Parse team and channel from the group (format: "team#channel")
  const [teamId, channelId] = lock.group.split("#");

  // Get Slack token for this team
  const token = await getSlackToken(teamId);
  if (!token) {
    console.warn(
      `No Slack token found for team ${teamId}, skipping notification`,
    );
    // Still delete the lock even if we can't notify
    await deleteLock(lock.resource, lock.group);
    return;
  }

  // Post notification to Slack
  const slackClient = new WebClient(token);
  try {
    await slackClient.chat.postMessage({
      channel: channelId,
      text: `Lock \`${lock.resource}\` held by <@${lock.owner}> has expired and been automatically released 🔓⏰`,
    });
    console.log(
      `Notified channel ${channelId} about expired lock ${lock.resource}`,
    );
  } catch (error) {
    console.error(
      `Failed to send Slack notification for lock ${lock.resource}:`,
      error,
    );
  }

  // Delete the lock
  await deleteLock(lock.resource, lock.group);
  console.log(`Deleted expired lock ${lock.resource} in ${lock.group}`);
}

// eslint-disable-next-line import/prefer-default-export
export const handler = async (): Promise<void> => {
  console.log("Checking for expired locks...");

  const expiredLocks = await getExpiredLocks();
  console.log(`Found ${expiredLocks.length} expired lock(s)`);

  // Process each expired lock
  await Promise.all(expiredLocks.map(notifyAndDeleteLock));

  console.log("Expiry handler completed");
};
