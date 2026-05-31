import express from "express";

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
