import { DocumentClient } from "aws-sdk/clients/dynamodb";
import TokenAuthorizer from "../src/token-authorizer";
import InMemoryAccessTokenRepo from "../src/storage/in-memory-token-repo";
import DynamoDBAccessTokenRepo from "../src/storage/dynamodb-token-repo";
import { recreateAccessTokenTable } from "./utils";

let ta: TokenAuthorizer;
const runAllTests = () => {
  test("Valid new token", async () => {
    const token = await ta.createAccessToken("Connor", "general", "our-team");
    expect(await ta.isAuthorized(token, "Connor", "general", "our-team")).toBe(
      true
    );
  });

  test("Valid replacement token", async () => {
    await ta.createAccessToken("Connor", "general", "our-team");
    const token = await ta.createAccessToken("Connor", "general", "our-team");
    expect(await ta.isAuthorized(token, "Connor", "general", "our-team")).toBe(
      true
    );
  });

  test("Invalid when token not created", async () => {
    expect(
      await ta.isAuthorized("random-token", "Connor", "general", "our-team")
    ).toBe(false);
  });

  test("Invalid when token incorrect", async () => {
    await ta.createAccessToken("Connor", "general", "our-team");
    expect(
      await ta.isAuthorized("incorrect-token", "Connor", "general", "our-team")
    ).toBe(false);
  });

  test("Invalid when old token", async () => {
    const oldToken = await ta.createAccessToken(
      "Connor",
      "general",
      "our-team"
    );
    await ta.createAccessToken("Connor", "general", "our-team");
    expect(
      await ta.isAuthorized(oldToken, "Connor", "general", "our-team")
    ).toBe(false);
  });
};

describe("in memory access token repo", () => {
  beforeEach(() => {
    ta = new TokenAuthorizer(new InMemoryAccessTokenRepo());
  });
  runAllTests();
});

describe("dynamodb token repo", () => {
  const accessTokenTableName = "token-authorizer-tests-tokens";
  beforeEach(async () => {
    await recreateAccessTokenTable(accessTokenTableName);
    ta = new TokenAuthorizer(
      new DynamoDBAccessTokenRepo(
        new DocumentClient({
          region: "localhost",
          endpoint: "http://localhost:8000",
        }),
        accessTokenTableName
      )
    );
  });
  runAllTests();
});
