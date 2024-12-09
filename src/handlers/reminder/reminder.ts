import * as env from "env-var";
import { WebClient, ErrorCode } from "@slack/web-api";
import { lockRepo } from "../api/infra";
import { Lock } from "../../lock-bot";

// TODO: Read this from `installations` table?
const botOauthToken = env.get("BOT_OAUTH_TOKEN").required().asString();

const slack = new WebClient(botOauthToken);

async function sendReminderMessage(lock: Lock) {
  console.log("Sending reminder", { lock });
  try {
    await slack.chat.postEphemeral({
      text: `You've had a lock on \`${lock.name}\` for a while now. Please remember to release it when you're done.`,
      channel: lock.channel,
      user: lock.owner,
    });
  } catch (error: any) {
    if (
      error.code === ErrorCode.HTTPError ||
      error.code === ErrorCode.PlatformError ||
      error.code === ErrorCode.RequestError ||
      error.code === ErrorCode.RateLimitedError
    ) {
      console.error("Failed to send reminder", { lock, error });
    } else {
      console.error("An unexpected error occurred", { lock, error });
    }
  }
}

const sendReminders = async (
  reminderThresholdMinutes: number
): Promise<void> => {
  const millisecondsPerMinute = 60000;
  const dateThreshold = new Date(
    Date.now() - reminderThresholdMinutes * millisecondsPerMinute
  );
  console.log("dateThreshold:", { dateThreshold });
  const locks = await lockRepo.getAllGlobal();
  await Promise.all(
    locks.map(async (lock) => {
      console.log("Checking lock:", { lock });
      if (lock.created < dateThreshold) {
        await sendReminderMessage(lock);
      }
    })
  );
};

export default sendReminders;
