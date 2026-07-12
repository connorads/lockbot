import request from "supertest";

// src/handlers/api/infra.ts reads these at module load, so they must be set
// before the dynamic import below; pointing the repos at nonexistent tables
// makes the authorizer's DynamoDB call reject, exercising the error handler
process.env.IS_OFFLINE = "true";
process.env.ACCESS_TOKENS_TABLE_NAME = "nonexistent-lockbot-tokens";
process.env.RESOURCES_TABLE_NAME = "nonexistent-lockbot-resources";

describe("api express app", () => {
  test("unhandled errors return JSON 500", async () => {
    const { app } = await import("../src/handlers/api/app");
    const credentials = Buffer.from("someuser:sometoken").toString("base64");

    const res = await request(app)
      .get("/api/teams/T012345WXYZ/channels/C012345ABCD/locks")
      .set("Authorization", `Basic ${credentials}`);

    expect(res.status).toBe(500);
    expect(res.type).toBe("application/json");
    expect(res.body).toEqual({ message: "Internal server error" });
  });
});
