import request from "supertest";
import { DocumentClient } from "aws-sdk/clients/dynamodb";
import TokenAuthorizer from "../src/token-authorizer";
import DynamoDBAccessTokenRepo from "../src/storage/dynamodb-token-repo";
import { recreateAccessTokenTable, recreateResourcesTable } from "./utils";

let credentials: string;
describe("dynamodb token repo", () => {
  const accessTokenTableName = "dev-lockbot-tokens";
  const resourcesTableName = "dev-lockbot-resources";
  beforeEach(async () => {
    await recreateAccessTokenTable(accessTokenTableName);
    await recreateResourcesTable(resourcesTableName);
    const ta = new TokenAuthorizer(
      new DynamoDBAccessTokenRepo(
        new DocumentClient({
          region: "localhost",
          endpoint: "http://localhost:8000",
        }),
        accessTokenTableName
      )
    );
    const accessToken = await ta.createAccessToken(
      "U012345MNOP",
      "C012345ABCD",
      "T012345WXYZ"
    );
    credentials = `${Buffer.from(`U012345MNOP:${accessToken}`).toString(
      "base64"
    )}`;
  });

  const server = request("http://localhost:3000");

  test("Missing basic auth", async () => {
    const res = await server.get(
      "/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks"
    );
    expect(res.status).toBe(401);
    expect(res.text).toBe("Missing basic auth");
  });

  test("Invalid credentials", async () => {
    const invalidCredentials = `${Buffer.from(`h4ck3r:b4dt0k3n`).toString(
      "base64"
    )}`;
    const res = await server
      .get("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")
      .set("Authorization", `Basic ${invalidCredentials}`);

    expect(res.status).toBe(401);
    expect(res.text).toBe("Unauthorized");
  });

  test("Valid credentials, incorrect channel", async () => {
    const res = await server
      .get("/dev/api/teams/T012345WXYZ/channels/C012345EFGH/locks")
      .set("Authorization", `Basic ${credentials}`);

    expect(res.status).toBe(401);
    expect(res.text).toBe("Unauthorized");
  });

  test("No resources", async () => {
    const res = await server
      .get("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")
      .set("Authorization", `Basic ${credentials}`);

    expect(res.status).toBe(200);
    expect(res.text).toBe(JSON.stringify([]));
  });

  test("create lock", async () => {
    const res = await server
      .post("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")
      .set("Authorization", `Basic ${credentials}`)
      .send({ name: "dev", owner: "U012345MNOP" });

    expect(res.status).toBe(201);
    expect(res.text).toBe(
      JSON.stringify({ name: "dev", owner: "U012345MNOP" })
    );
  });

  test("create two locks", async () => {
    await server
      .post("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")
      .set("Authorization", `Basic ${credentials}`)
      .send({ name: "dev", owner: "U012345MNOP" });
    await server
      .post("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")
      .set("Authorization", `Basic ${credentials}`)
      .send({ name: "test", owner: "U012345MNOP" });
    const res = await server
      .get("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")
      .set("Authorization", `Basic ${credentials}`);

    expect(res.status).toBe(200);
    expect(res.text).toBe(
      JSON.stringify([
        { name: "dev", owner: "U012345MNOP" },
        { name: "test", owner: "U012345MNOP" },
      ])
    );
  });

  test.each([
    [{ name: "dev" }, { status: "error", errors: "" }],
    [{ owner: "U012345MNOP" }, {}],
    [{}, {}],
  ])("try create lock with bad payload", async (req, expectedResponseBody) => {
    const res = await server
      .post("/dev/api/teams/T012345WXYZ/channels/C012345ABCD/locks")
      .set("Authorization", `Basic ${credentials}`)
      .send(JSON.stringify(req));

    expect(res.status).toBe(400);
    expect(res.text).toBe(JSON.stringify(expectedResponseBody));
  });

  test("try lock your existing lock", async () => {});

  test("try lock someone else's existing lock", async () => {});

  test("create lock, delete lock", async () => {});

  test("try delete non-existant lock", async () => {});

  test("try delete someone else's lock", async () => {});
});
