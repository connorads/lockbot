import awsServerlessExpress from "aws-serverless-express";
import express, { Request, Response, NextFunction } from "express";
import { APIGatewayProxyEvent, Context } from "aws-lambda";
import * as env from "env-var";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import auth from "basic-auth";
import * as D from "io-ts/lib/Decoder";
import { pipe } from "fp-ts/lib/function";
import { isLeft } from "fp-ts/lib/Either";
import DynamoDBLockRepo from "../storage/dynamodb-lock-repo";
import TokenAuthorizer from "../token-authorizer";
import DynamoDBAccessTokenRepo from "../storage/dynamodb-token-repo";

const app = express();
app.use(express.json());

const documentClient = env.get("IS_OFFLINE").asBool()
  ? new DocumentClient({
      region: "localhost",
      endpoint: "http://localhost:8000",
    })
  : new DocumentClient();
const tokenAuthorizer = new TokenAuthorizer(
  new DynamoDBAccessTokenRepo(
    documentClient,
    env.get("ACCESS_TOKENS_TABLE_NAME").required().asString()
  )
);
const lockRepo = new DynamoDBLockRepo(
  documentClient,
  env.get("RESOURCES_TABLE_NAME").required().asString()
);

interface NonEmptyWhitespaceFreeStringBrand {
  readonly NonEmptyWhitespaceFreeString: unique symbol;
}
type NonEmptyWhitespaceFreeString = string & NonEmptyWhitespaceFreeStringBrand;
const NonEmptyWhitespaceFreeString: D.Decoder<
  unknown,
  NonEmptyWhitespaceFreeString
> = pipe(
  D.string,
  D.refine(
    (s): s is NonEmptyWhitespaceFreeString => s.length > 0 && !/\s/.test(s),
    "NonEmptyWhitespaceFreeString"
  )
);

const Lock = D.type({
  name: NonEmptyWhitespaceFreeString,
  owner: NonEmptyWhitespaceFreeString,
});
interface Lock extends D.TypeOf<typeof Lock> {}

const authorizer = async (req: Request, res: Response, next: NextFunction) => {
  const { channel, team } = req.params;
  const user = auth(req);
  if (!user) {
    console.log("Missing basic auth", { channel, team });
    res.status(401).json({ error: "Missing basic auth" });
  } else if (
    await tokenAuthorizer.isAuthorized(user.pass, user.name, channel, team)
  ) {
    console.log("Authorized", { team, channel, username: user.name });
    next();
  } else {
    console.log("Unauthorized", { team, channel, username: user.name });
    res.status(401).json({ error: "Unauthorized" });
  }
};

app.get(
  "/api/teams/:team/channels/:channel/locks",
  authorizer,
  async (req, res) => {
    const { team, channel } = req.params;
    const locksMap = await lockRepo.getAll(channel, team);
    const locks: Lock[] = [];
    locksMap.forEach((v, k) => locks.push({ name: k, owner: v } as Lock));
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
      res.status(404).json({ error: `${lockName} not found` });
    }
  }
);

const validator = async (req: Request, res: Response, next: NextFunction) => {
  const decoded = Lock.decode(req.body);
  if (isLeft(decoded)) {
    const error = D.draw(decoded.left);
    console.log("Invalid request", { body: req.body, error });
    res.status(400).json({ error });
  } else {
    next();
  }
};

app.post(
  "/api/teams/:team/channels/:channel/locks",
  authorizer,
  validator,
  async (req, res) => {
    const username = auth(req)!.name;
    const { channel, team } = req.params;
    const lock = req.body as Lock;
    if (lock.owner !== username) {
      const error = `${username} cannot lock for another user ${lock.owner}`;
      console.log("Cannot lock", { username, body: req.body, error });
      res.status(403).json({ error });
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
        res.status(403).json({ error });
      }
    }
  }
);

app.delete(
  "/api/teams/:team/channels/:channel/locks/:lock",
  authorizer,
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
      res.status(403).json({ error });
    }
  }
);

const server = awsServerlessExpress.createServer(app);
const handler = (event: APIGatewayProxyEvent, context: Context) =>
  awsServerlessExpress.proxy(server, event, context);
exports.handler = handler;
