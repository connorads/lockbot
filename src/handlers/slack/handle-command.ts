import {
  Logger,
  RespondFn,
  SlackCommandMiddlewareArgs,
  SlashCommand,
} from "@slack/bolt";
import { Destination, Response } from "../../lock-bot";

const getResponseType = (destination: Destination) => {
  let responseType: "in_channel" | "ephemeral";
  switch (destination) {
    case "channel":
      responseType = "in_channel";
      break;
    case "user":
      responseType = "ephemeral";
      break;
  }
  return responseType;
};

const handleResponse = async (
  response: Promise<Response>,
  respond: RespondFn,
  logger: Logger
): Promise<void> => {
  try {
    const { message, destination } = await response;
    const respondArguments = {
      text: message,
      response_type: getResponseType(destination),
    };
    logger.info("Sending response.", respondArguments);
    await respond(respondArguments);
    logger.info("Response sent.");
  } catch (error) {
    logger.error(error);
    await respond({
      text:
        "❌ Oops, something went wrong!\n" +
        "Contact support@lockbot.app if this issue persists.",
      response_type: "ephemeral",
    });
  }
};

const handleCommand = (
  getResponse: (command: SlashCommand) => Promise<Response>
) => {
  return async ({
    command,
    logger,
    ack,
    respond,
  }: SlackCommandMiddlewareArgs & {
    logger: Logger;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, camelcase
    const { token, trigger_id, response_url, ...commandProps } = command;
    logger.info("Command received.", commandProps);
    await ack();
    const response = getResponse(command);
    await handleResponse(response, respond, logger);
    logger.info("Command handled.");
  };
};

export default handleCommand;
