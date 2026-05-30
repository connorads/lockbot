import express from "express";

// Extracted from index.ts so the routes can be exercised in-process with
// supertest, without webpack's html text-loader or the SERVERLESS_STAGE env
// read. index.ts still owns requiring swagger.html / openapi.json and reading
// the stage, then hands them in here. The stage-aware `servers` field is now
// applied to a copy rather than mutating the caller's document.
const createSwaggerApp = (
  stage: string,
  swaggerHtml: string,
  openApiJson: Record<string, unknown>
) => {
  const openApiWithServers = {
    ...openApiJson,
    servers: [{ url: `/${stage}` }],
  };

  const app = express();

  app.get("/api-docs", async (req, res) => {
    res.set("Content-Type", "text/html; charset=utf-8");
    res.send(swaggerHtml);
  });

  app.get(["/openapi.json", "/api-docs/openapi.json"], async (req, res) => {
    res.set("Content-Type", "application/json; charset=utf-8");
    res.send(openApiWithServers);
  });

  return app;
};

export default createSwaggerApp;
