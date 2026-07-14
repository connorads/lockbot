import type { Logger, SlashCommand } from "@slack/bolt";
import handleCommand from "../src/handlers/slack/handle-command";
import type { Destination, Response } from "../src/lock-bot";

const buildCommand = (overrides: Partial<SlashCommand> = {}): SlashCommand => ({
  token: "secret-token",
  command: "/lock",
  text: "thing",
  response_url: "https://hooks.slack.com/secret-response-url",
  trigger_id: "secret-trigger-id",
  user_id: "U1",
  user_name: "Connor",
  team_id: "T1",
  team_domain: "our-team",
  channel_id: "C1",
  channel_name: "general",
  api_app_id: "A1",
  ...overrides,
});

const buildLogger = () =>
  ({ info: vi.fn(), error: vi.fn() }) as unknown as Logger;

const invoke = (
  getResponse: (command: SlashCommand) => Promise<Response>,
  command: SlashCommand = buildCommand(),
) => {
  const ack = vi.fn();
  const respond = vi.fn();
  const logger = buildLogger();
  return {
    ack,
    respond,
    logger,
    run: handleCommand(getResponse)({
      command,
      logger,
      ack,
      respond,
    } as never),
  };
};

describe("handleCommand", () => {
  it("acknowledges the command", async () => {
    const { ack, run } = invoke(async () => ({
      message: "ok",
      destination: "user",
    }));
    await run;
    expect(ack).toHaveBeenCalledOnce();
  });

  it.each<[Destination, "in_channel" | "ephemeral"]>([
    ["channel", "in_channel"],
    ["user", "ephemeral"],
  ])("maps destination %s to response_type %s", async (destination, type) => {
    const { respond, run } = invoke(async () => ({
      message: "the message",
      destination,
    }));
    await run;
    expect(respond).toHaveBeenCalledWith({
      text: "the message",
      response_type: type,
    });
  });

  it("keeps secrets out of the logged command props", async () => {
    const { logger, run } = invoke(async () => ({
      message: "ok",
      destination: "user",
    }));
    await run;
    const loggedProps = (logger.info as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[1];
    expect(loggedProps).not.toHaveProperty("token");
    expect(loggedProps).not.toHaveProperty("trigger_id");
    expect(loggedProps).not.toHaveProperty("response_url");
    expect(loggedProps).toMatchObject({
      command: "/lock",
      user_name: "Connor",
    });
  });

  it("logs the error and responds ephemerally when getResponse rejects", async () => {
    const error = new Error("boom");
    const { logger, respond, run } = invoke(() => Promise.reject(error));
    await run;
    expect(logger.error).toHaveBeenCalledWith(error);
    expect(respond).toHaveBeenCalledWith({
      text:
        "❌ Oops, something went wrong!\n" +
        "Contact support@lockbot.app if this issue persists.",
      response_type: "ephemeral",
    });
  });
});
