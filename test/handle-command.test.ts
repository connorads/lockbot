import {
  LogLevel,
  Logger,
  SlackCommandMiddlewareArgs,
  SlashCommand,
} from "@slack/bolt";
import handleCommand from "../src/handlers/slack/handle-command";
import { Response } from "../src/lock-bot";

const aSlashCommand = (
  overrides: Partial<SlashCommand> = {}
): SlashCommand => ({
  token: "verification-token",
  command: "/lock",
  text: "dev",
  response_url: "https://hooks.slack.com/commands/T012345WXYZ/0000/aaaa",
  trigger_id: "0000000000.000000000.aaaaaaaaaaaaaaaaaaaaaaaa",
  user_id: "U012345MNOP",
  user_name: "connor",
  team_id: "T012345WXYZ",
  team_domain: "our-team",
  channel_id: "C012345ABCD",
  channel_name: "general",
  api_app_id: "A012345678",
  ...overrides,
});

// Drives handle-command with in-memory fakes (no mocks) that record what the
// adapter does with the bot's Response: how it acknowledges, what it sends back,
// and what it logs. This is the seam every Bolt / serverless-express migration
// touches, so locking it down first lets later upgrades prove they're behaviour
// preserving.
const setup = (getResponse: (command: SlashCommand) => Promise<Response>) => {
  const order: string[] = [];
  const responded: unknown[] = [];
  const infoCalls: unknown[][] = [];
  const errorCalls: unknown[][] = [];
  const noop = () => {
    /* logger output is irrelevant to these tests */
  };
  const logger: Logger = {
    debug: noop,
    info: (...msg) => {
      infoCalls.push(msg);
    },
    warn: noop,
    error: (...msg) => {
      errorCalls.push(msg);
    },
    setLevel: noop,
    getLevel: () => LogLevel.DEBUG,
    setName: noop,
  };
  const command = aSlashCommand();
  const args: SlackCommandMiddlewareArgs & { logger: Logger } = {
    payload: command,
    command,
    body: command,
    say: async () => {
      throw new Error("say is not used by the slash command handler");
    },
    respond: async (message) => {
      order.push("respond");
      responded.push(message);
    },
    ack: async () => {
      order.push("ack");
    },
    logger,
  };
  const invoke = () => handleCommand(getResponse)(args);
  return { invoke, order, responded, infoCalls, errorCalls };
};

describe("handleCommand", () => {
  test("acknowledges the command before responding", async () => {
    const { invoke, order } = setup(async () => ({
      message: "anything",
      destination: "user",
    }));
    await invoke();
    expect(order).toEqual(["ack", "respond"]);
  });

  test("sends a channel response as an in_channel message", async () => {
    const { invoke, responded } = setup(async () => ({
      message: "<@Connor> has locked `dev` 🔒",
      destination: "channel",
    }));
    await invoke();
    expect(responded).toEqual([
      {
        text: "<@Connor> has locked `dev` 🔒",
        response_type: "in_channel",
      },
    ]);
  });

  test("sends a user response as an ephemeral message", async () => {
    const { invoke, responded } = setup(async () => ({
      message: "No active locks in this channel 🔓",
      destination: "user",
    }));
    await invoke();
    expect(responded).toEqual([
      {
        text: "No active locks in this channel 🔓",
        response_type: "ephemeral",
      },
    ]);
  });

  test("responds with an ephemeral fallback when getting the response throws", async () => {
    const { invoke, responded, errorCalls } = setup(async () => {
      throw new Error("DynamoDB is unavailable");
    });
    await invoke();
    expect(responded).toEqual([
      {
        text:
          "❌ Oops, something went wrong!\n" +
          "Contact support@lockbot.app if this issue persists.",
        response_type: "ephemeral",
      },
    ]);
    expect(errorCalls).toHaveLength(1);
  });

  test("still acknowledges the command when getting the response throws", async () => {
    const { invoke, order } = setup(async () => {
      throw new Error("DynamoDB is unavailable");
    });
    await invoke();
    expect(order).toEqual(["ack", "respond"]);
  });

  test("logs the command without the token, trigger_id or response_url", async () => {
    const { invoke, infoCalls } = setup(async () => ({
      message: "anything",
      destination: "user",
    }));
    await invoke();
    const [firstMessage, commandProps] = infoCalls[0];
    expect(firstMessage).toEqual("Command received.");
    expect(commandProps).not.toHaveProperty("token");
    expect(commandProps).not.toHaveProperty("trigger_id");
    expect(commandProps).not.toHaveProperty("response_url");
    expect(commandProps).toMatchObject({ command: "/lock", text: "dev" });
  });
});
