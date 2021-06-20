import express from "express";
import * as env from "env-var";
import serverlessExpress from "@vendia/serverless-express";

const swaggerHtml = require("./swagger.html");
const openApiJson = require("./openapi.json");

const stage = env.get("SERVERLESS_STAGE").required().asString();
openApiJson.servers = [{ url: `/${stage}` }];

const app = express();

app.get("/api-docs", async (req, res) => {
  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(swaggerHtml);
});

app.get(["/openapi.json", "/api-docs/openapi.json"], async (req, res) => {
  res.set("Content-Type", "application/json; charset=utf-8");
  res.send(openApiJson);
});

exports.handler = serverlessExpress({ app });
