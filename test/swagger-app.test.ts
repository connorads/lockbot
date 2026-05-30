import request from "supertest";
import createSwaggerApp from "../src/handlers/swagger/app";

const swaggerHtml =
  '<!DOCTYPE html><html lang="en"><head><title>Swagger UI</title></head></html>';

const anOpenApiDocument = () => ({
  openapi: "3.0.1",
  info: { title: "Lockbot", version: "1.0.0" },
  paths: {},
});

describe("swagger app", () => {
  test("serves the Swagger UI HTML at /api-docs", async () => {
    const app = createSwaggerApp("dev", swaggerHtml, anOpenApiDocument());
    const response = await request(app).get("/api-docs");
    expect(response.status).toEqual(200);
    expect(response.type).toEqual("text/html");
    expect(response.text).toEqual(swaggerHtml);
  });

  test("serves the OpenAPI document at /openapi.json", async () => {
    const app = createSwaggerApp("dev", swaggerHtml, anOpenApiDocument());
    const response = await request(app).get("/openapi.json");
    expect(response.status).toEqual(200);
    expect(response.type).toEqual("application/json");
    expect(response.body.openapi).toEqual("3.0.1");
  });

  test("also serves the OpenAPI document at /api-docs/openapi.json", async () => {
    const app = createSwaggerApp("dev", swaggerHtml, anOpenApiDocument());
    const response = await request(app).get("/api-docs/openapi.json");
    expect(response.status).toEqual(200);
    expect(response.body.info.title).toEqual("Lockbot");
  });

  test("injects the stage into the OpenAPI servers field", async () => {
    const app = createSwaggerApp("prod", swaggerHtml, anOpenApiDocument());
    const response = await request(app).get("/openapi.json");
    expect(response.body.servers).toEqual([{ url: "/prod" }]);
  });

  test("does not mutate the caller's OpenAPI document", async () => {
    const document = anOpenApiDocument();
    createSwaggerApp("dev", swaggerHtml, document);
    expect(document).not.toHaveProperty("servers");
  });
});
