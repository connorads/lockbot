import * as env from "env-var";
import serverlessExpress from "@vendia/serverless-express";
import createSwaggerApp from "./app";

// swagger.html is inlined as text by webpack's text-loader (webpack.config.js).
const swaggerHtml = require("./swagger.html");
const openApiJson = require("./openapi.json");

const stage = env.get("SERVERLESS_STAGE").required().asString();
const app = createSwaggerApp(stage, swaggerHtml, openApiJson);

exports.handler = serverlessExpress({ app });
