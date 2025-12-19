import serverlessExpress from "@vendia/serverless-express";
import { app, expressReceiver, lockBot, prefix, url } from "./infra";
import handleCommand from "./handle-command";
import {
  getFirstParam,
  parseLock,
  parseResourceList,
  parseUnlock,
} from "./command-parsers";

app.command(
  `/${prefix}locks`,
  handleCommand((command) =>
    lockBot.locks(command.channel_id, command.team_id),
  ),
);

app.command(
  `/${prefix}lock`,
  handleCommand((command) => {
    const { resource, expiry } = parseLock(command.text);
    return lockBot.lock(
      resource,
      command.user_id,
      command.channel_id,
      command.team_id,
      {
        User: command.user_name,
        Channel: command.channel_name,
        Team: command.team_domain,
      },
      expiry,
    );
  }),
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
      { force },
    );
  }),
);

app.command(
  `/${prefix}lbtoken`,
  handleCommand((command) =>
    lockBot.lbtoken(
      getFirstParam(command.text),
      command.user_id,
      command.channel_id,
      command.team_id,
      url,
    ),
  ),
);

// Resource management commands
app.command(
  `/${prefix}add-resources`,
  handleCommand((command) => {
    const resources = parseResourceList(command.text);
    return lockBot.addResources(resources, command.channel_id, command.team_id);
  }),
);

app.command(
  `/${prefix}remove-resources`,
  handleCommand((command) => {
    const resources = parseResourceList(command.text);
    return lockBot.removeResources(
      resources,
      command.channel_id,
      command.team_id,
    );
  }),
);

app.command(
  `/${prefix}list-resources`,
  handleCommand((command) =>
    lockBot.listResources(command.channel_id, command.team_id),
  ),
);

app.command(
  `/${prefix}set-lock-mode`,
  handleCommand((command) =>
    lockBot.setLockMode(
      getFirstParam(command.text),
      command.channel_id,
      command.team_id,
    ),
  ),
);

app.command(
  `/${prefix}set-lock-expiry`,
  handleCommand((command) =>
    lockBot.setLockExpiry(
      getFirstParam(command.text),
      command.channel_id,
      command.team_id,
    ),
  ),
);

// eslint-disable-next-line import/prefer-default-export
export const handler = serverlessExpress({ app: expressReceiver.app });
