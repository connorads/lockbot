import { APIGatewayProxyEvent, Context } from "aws-lambda";
import * as awsServerlessExpress from "aws-serverless-express";
import { app, expressReceiver, lockBot, prefix, url } from "./infra";
import { handleCommand, getFirstParam, parseUnlock } from "./lib";

app.command(
  `/${prefix}locks`,
  handleCommand((command) => lockBot.locks(command.channel_id, command.team_id))
);
app.command(
  `/${prefix}lock`,
  handleCommand((command) =>
    lockBot.lock(
      getFirstParam(command.text),
      command.user_id,
      command.channel_id,
      command.team_id
    )
  )
);
app.command(
  `/${prefix}unlock`,
  handleCommand((command) => {
    const { resource, force } = parseUnlock(command.text);
    return lockBot.unlock(
      resource,
      command.user_id,
      command.channel_id,
      command.team_id,
      { force }
    );
  })
);

app.command(
  `/${prefix}lbtoken`,
  handleCommand((command) =>
    lockBot.lbtoken(
      getFirstParam(command.text),
      command.user_id,
      command.channel_id,
      command.team_id,
      url
    )
  )
);

const server = awsServerlessExpress.createServer(expressReceiver.app);
const handler = (event: APIGatewayProxyEvent, context: Context) =>
  awsServerlessExpress.proxy(server, event, context);
exports.handler = handler;
