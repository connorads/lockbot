import serverlessExpress from "@vendia/serverless-express";
import { app, expressReceiver, lockBot, prefix, url } from "./infra";
import handleCommand from "./handle-command";
import {getFirstParam, getSecondParam, parseUnlock} from "./command-parsers";

app.command(
  `/${prefix}locks`,
  handleCommand((command) => lockBot.locks(command.channel_id, command.team_id))
);
app.command(
  `/${prefix}lock`,
  handleCommand((command) => {
    const resourceName = getFirstParam(command.text);
    const descriptionMessage = getSecondParam(command.text);
    return lockBot.lock(
      resourceName,
      command.user_id,
      command.channel_id,
      command.team_id,
      {
        User: command.user_name,
        Channel: command.channel_name,
        Team: command.team_domain,
        Message: descriptionMessage,
      }
    );
  })
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

exports.handler = serverlessExpress({ app: expressReceiver.app });
