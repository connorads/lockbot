import express from "express";
import serverlessExpress from "@vendia/serverless-express";
import auth from "basic-auth";
import {
  authorizer,
  bodyValidator,
  handleErrors,
  paramsValidator,
  parseAllContentAsJson,
} from "./middleware";
import { Lock } from "./types";
import { lockRepo } from "./infra";

const app = express();

app.use(parseAllContentAsJson);
app.use(handleErrors);

app.get(
  "/api/teams/:team/channels/:channel/locks",
  authorizer,
  async (req, res) => {
    const { team, channel } = req.params;
    const locksMap = await lockRepo.getAll(channel, team);
    const locks: Lock[] = [];
    locksMap.forEach((v, k) => locks.push({ name: k, owner: v.owner } as Lock));
    console.log("Retrieved locks", { locks });
    res.status(200).json(locks);
  }
);

app.get(
  "/api/teams/:team/channels/:channel/locks/:lock",
  authorizer,
  async (req, res) => {
    const { team, channel, lock: lockName } = req.params;
    const lockOwner = await lockRepo.getOwner(lockName, channel, team);
    if (lockOwner) {
      const lock = { name: lockName, owner: lockOwner } as Lock;
      console.log("Retrieved lock", { lock });
      res.status(200).json(lock);
    } else {
      console.log("Lock not found", { lockName });
      res.status(404).json({ message: `${lockName} not found` });
    }
  }
);

app.post(
  "/api/teams/:team/channels/:channel/locks",
  authorizer,
  bodyValidator,
  async (req, res) => {
    const username = auth(req)!.name;
    const { channel, team } = req.params;
    const lock = req.body as Lock;
    if (lock.owner !== username) {
      const error = `${username} cannot lock for another user ${lock.owner}`;
      console.log("Cannot lock", { username, body: req.body, error });
      res.status(403).json({ message: error });
    } else {
      const lockOwner = await lockRepo.getOwner(lock.name, channel, team);
      if (!lockOwner) {
        await lockRepo.setOwner(lock.name, lock.owner, channel, team);
        console.log("Added lock", { lock });
        res.status(201).json(lock);
      } else if (lockOwner === lock.owner) {
        console.log("Lock exists", { lock });
        res.status(200).json(lock);
      } else {
        const error = `${lock.name} is already locked by ${lockOwner}`;
        console.log("Cannot lock", { lock, lockOwner, error });
        res.status(403).json({ message: error });
      }
    }
  }
);

app.delete(
  "/api/teams/:team/channels/:channel/locks/:lock",
  authorizer,
  paramsValidator,
  async (req, res) => {
    const { team, channel, lock: lockName } = req.params;
    const lockOwner = await lockRepo.getOwner(lockName, channel, team);
    if (!lockOwner) {
      console.log("No lock to delete", { lockName });
      res.status(204).end();
    } else if (lockOwner === auth(req)!.name) {
      const lock = { name: lockName, owner: lockOwner } as Lock;
      await lockRepo.delete(lockName, channel, team);
      console.log("Lock deleted", { lock });
      res.status(204).end();
    } else {
      const lock = { name: lockName, owner: lockOwner } as Lock;
      const error = `Cannot unlock ${lock.name}, locked by ${lockOwner}`;
      console.log("Cannot unlock", { lock, error });
      res.status(403).json({ message: error });
    }
  }
);

exports.handler = serverlessExpress({ app });
