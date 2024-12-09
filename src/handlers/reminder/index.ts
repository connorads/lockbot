/*
# reminder

This is a Lambda function that reminds users periodically if they have any active Lockbot locks.

It works by getting the list of active locks from the Lockbot database, and parsing the data to
determine if a user has had an active lock for more than a configured amount of time; for each such
user, it sends them a private reminder message on Slack.

This function is triggered by a timer so that it runs at a regular interval.

*NOTE: This function does not store any record of whether a user has already been reminded, so it
must be scheduled to run at an interval that is frequent enough to notify a user within a reasonable
amount of time of the configured threshold, while also not sending reminders too frequently.*

## Configuration

- `reminder_threshold_in_minutes`
  - The number of minutes that a user has held a lock before they start receiving reminder messages
*/
import { EventBridgeHandler, EventBridgeEvent, Context } from "aws-lambda";
import * as env from "env-var";
import sendReminders from "./reminder";

const defaultReminderThresholdMinutes: number = 240;

type ScheduledEvent = EventBridgeEvent<"Scheduled Event", string>;

export const handler: EventBridgeHandler<any, string, void> = async (
  event: ScheduledEvent,
  context: Context
) => {
  const reminderThresholdMinutes: number =
    env.get("LOCK_REMINDER_THRESHOLD_MINUTES").asIntPositive() ??
    defaultReminderThresholdMinutes;

  console.log("event:", { event });
  console.log("context:", { context });
  console.log("reminderThresholdMinutes:", { reminderThresholdMinutes });

  await sendReminders(reminderThresholdMinutes);
};

export default handler;
