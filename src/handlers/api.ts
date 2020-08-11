import awsServerlessExpress from "aws-serverless-express";
import express from "express";
import { APIGatewayProxyEvent, Context } from "aws-lambda";
import * as env from "env-var";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import auth from "basic-auth";
import * as D from "io-ts/lib/Decoder";
import { isLeft } from "fp-ts/lib/Either";
import DynamoDBLockRepo from "../storage/dynamodb-lock-repo";
import TokenAuthorizer from "../token-authorizer";
import DynamoDBAccessTokenRepo from "../storage/dynamodb-token-repo";
import LockBot from "../lock-bot";

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

const Lock = D.type({
  name: D.string,
  owner: D.string,
});

interface Lock extends D.TypeOf<typeof Lock> {}

app.get("/api/teams/:team/channels/:channel/locks", async (req, res) => {
  const { channel, team } = req.params;
  const user = auth(req);
  if (!user) {
    console.log("Missing basic auth", { channel, team });
    res.status(401).send("Missing basic auth");
  } else if (
    await tokenAuthorizer.isAuthorized(user.pass, user.name, channel, team)
  ) {
    const locksMap = await lockRepo.getAll(channel, team);
    const locks: Lock[] = [];
    locksMap.forEach((v, k) => locks.push({ name: k, owner: v }));
    console.log("Retrieved locks", { channel, team, locks });
    res.status(200).json(locks);
  } else {
    console.log("Unauthorized", { channel, team, user: user.name });
    res.status(401).send("Unauthorized");
  }
});

app.post("/api/teams/:team/channels/:channel/locks", async (req, res) => {
  const { channel, team } = req.params;
  const user = auth(req);
  if (!user) {
    console.log("Missing basic auth", { channel, team });
    res.status(401).send("Missing basic auth");
  } else if (
    await tokenAuthorizer.isAuthorized(user.pass, user.name, channel, team)
  ) {
    console.log("req.body", req.body); // TODO remove

    const decoded = Lock.decode(req.body);
    if (isLeft(decoded)) {
      res.status(400).json({ error: D.draw(decoded.left) });
    } else {
      const lock: Lock = decoded.right;

      // TODO wrong owner
      //const lockOwner = await lockRepo.getOwner(lock.name, channel, team);

      await lockRepo.setOwner(lock.name, lock.owner, channel, team);
      console.log("Added lock", { channel, team, lock });
      res.status(201).json(lock);
    }
  } else {
    console.log("Unauthorized", { channel, team, user: user.name });
    res.status(401).send("Unauthorized");
  }
});

const server = awsServerlessExpress.createServer(app);
const handler = (event: APIGatewayProxyEvent, context: Context) =>
  awsServerlessExpress.proxy(server, event, context);
exports.handler = handler;
