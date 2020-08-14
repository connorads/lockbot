import request from "supertest";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import TokenAuthorizer from "../src/token-authorizer";
import DynamoDBAccessTokenRepo from "../src/storage/dynamodb-token-repo";
import { recreateAccessTokenTable, recreateResourcesTable } from "./utils";

let credentials1: string;
let credentials2: string;
describe("dynamodb token repo", () => {
  const accessTokenTableName = "dev-lockbot-tokens";
  const resourcesTableName = "dev-lockbot-resources";
  beforeEach(async () => {
    await recreateAccessTokenTable(accessTokenTableName);
    await recreateResourcesTable(resourcesTableName);
    const tokenAuthorizer = new TokenAuthorizer(
      new DynamoDBAccessTokenRepo(
        new DocumentClient({
          region: "localhost",
          endpoint: "http://localhost:8000",
        }),
        accessTokenTableName
      )
    );
    const createToken = (user: string) =>
      tokenAuthorizer.createAccessToken(user, "C012345ABCD", "T012345WXYZ");

    const token1 = await createToken("U012345MNOP");
    credentials1 = `${Buffer.from(`U012345MNOP:${token1}`).toString("base64")}`;

    const token2 = await createToken("U012345QRST");
    credentials2 = `${Buffer.from(`U012345QRST:${token2}`).toString("base64")}`;
  });

  const server = request("http://localhost:3000");

  test.each([
    [server.get("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")],
    [server.post("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")],
  ])("Missing basic auth", async (apiCall) => {
    const res = await apiCall;

    expect(res.status).toBe(401);
    expect(res.text).toBe(JSON.stringify({ error: "Missing basic auth" }));
  });

  test.each([
    [server.get("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")],
    [server.post("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")],
  ])("Invalid credentials", async (apiCall) => {
    const invalidCredentials = `${Buffer.from(`h4ck3r:b4dt0k3n`).toString(
      "base64"
    )}`;

    const res = await apiCall.set(
      "Authorization",
      `Basic ${invalidCredentials}`
    );

    expect(res.status).toBe(401);
    expect(res.text).toBe(JSON.stringify({ error: "Unauthorized" }));
  });

  test.each([
    [server.get("/dev/api/teams/T012345WXYZ/channels/C012345EFGH/locks")],
    [server.post("/dev/api/teams/T012345WXYZ/channels/C012345EFGH/locks")],
  ])("Valid credentials, incorrect channel", async (apiCall) => {
    const res = await apiCall.set("Authorization", `Basic ${credentials1}`);

    expect(res.status).toBe(401);
    expect(res.text).toBe(JSON.stringify({ error: "Unauthorized" }));
  });

  test("Get non-existent locks", async () => {
    const res = await server
      .get("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")
      .set("Authorization", `Basic ${credentials1}`);

    expect(res.status).toBe(200);
    expect(res.text).toBe(JSON.stringify([]));
  });

  test("Get non-existent lock", async () => {
    const res = await server
      .get("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks/dev")
      .set("Authorization", `Basic ${credentials1}`);

    expect(res.status).toBe(404);
    expect(res.text).toBe(JSON.stringify({ error: "dev not found" }));
  });

  test("Create lock", async () => {
    const res = await server
      .post("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")
      .set("Authorization", `Basic ${credentials1}`)
      .send({ name: "dev", owner: "U012345MNOP" });

    expect(res.status).toBe(201);
    expect(res.text).toBe(
      JSON.stringify({ name: "dev", owner: "U012345MNOP" })
    );
  });

  test("Get lock", async () => {
    await server
      .post("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")
      .set("Authorization", `Basic ${credentials1}`)
      .send({ name: "dev", owner: "U012345MNOP" });

    const res = await server
      .get("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks/dev")
      .set("Authorization", `Basic ${credentials1}`);

    expect(res.status).toBe(200);
    expect(res.text).toBe(
      JSON.stringify({ name: "dev", owner: "U012345MNOP" })
    );
  });

  test("Create two locks, get locks", async () => {
    await server
      .post("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")
      .set("Authorization", `Basic ${credentials1}`)
      .send({ name: "dev", owner: "U012345MNOP" });
    await server
      .post("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")
      .set("Authorization", `Basic ${credentials1}`)
      .send({ name: "test", owner: "U012345MNOP" });
    const res = await server
      .get("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")
      .set("Authorization", `Basic ${credentials1}`);

    expect(res.status).toBe(200);
    expect(res.text).toBe(
      JSON.stringify([
        { name: "dev", owner: "U012345MNOP" },
        { name: "test", owner: "U012345MNOP" },
      ])
    );
  });

  test.each([
    [
      { name: "dev" },
      {
        error:
          'required property "owner"\n' +
          "└─ cannot decode undefined, should be string",
      },
    ],
    [
      { owner: "U012345MNOP" },
      {
        error:
          'required property "name"\n' +
          "└─ cannot decode undefined, should be string",
      },
    ],
    [
      {},
      {
        error:
          'required property "name"\n' +
          "└─ cannot decode undefined, should be string\n" +
          'required property "owner"\n' +
          "└─ cannot decode undefined, should be string",
      },
    ],
  ])("Try create lock with bad payload", async (req, expectedResponseBody) => {
    const res = await server
      .post("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")
      .set("Authorization", `Basic ${credentials1}`)
      .send(req);

    expect(res.status).toBe(400);
    expect(res.text).toBe(JSON.stringify(expectedResponseBody));
  });

  test("Try lock your existing lock", async () => {
    await server
      .post("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")
      .set("Authorization", `Basic ${credentials1}`)
      .send({ name: "dev", owner: "U012345MNOP" });
    const res = await server
      .post("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")
      .set("Authorization", `Basic ${credentials1}`)
      .send({ name: "dev", owner: "U012345MNOP" });

    expect(res.status).toBe(200);
    expect(res.text).toBe(
      JSON.stringify({ name: "dev", owner: "U012345MNOP" })
    );
  });

  test("Try lock someone else's existing lock", async () => {
    await server
      .post("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")
      .set("Authorization", `Basic ${credentials2}`)
      .send({ name: "dev", owner: "U012345QRST" });
    const res = await server
      .post("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")
      .set("Authorization", `Basic ${credentials1}`)
      .send({ name: "dev", owner: "U012345MNOP" });

    expect(res.status).toBe(403);
    expect(res.text).toBe(
      JSON.stringify({ error: "dev is already locked by U012345QRST" })
    );
  });

  test("create lock, delete lock", async () => {});

  test("try delete non-existant lock", async () => {});

  test("try delete someone else's lock", async () => {});
});
