import test from "node:test";
import assert from "node:assert/strict";
import { aiReady } from "../server/assistant.js";
import { GET } from "../api/status.js";

test("IA reconhece OIDC recebido no contexto da função sem variável de ambiente", async () => {
  const contextKey = Symbol.for("@vercel/request-context");
  const globals = globalThis as Record<symbol, unknown>;
  const previousContext = globals[contextKey];
  const previousKey = process.env.AI_GATEWAY_API_KEY;
  const previousToken = process.env.VERCEL_OIDC_TOKEN;
  try {
    delete process.env.AI_GATEWAY_API_KEY;
    delete process.env.VERCEL_OIDC_TOKEN;
    globals[contextKey] = { get: () => ({}) };
    assert.equal(aiReady(), false);

    globals[contextKey] = {
      get: () => ({ headers: { "x-vercel-oidc-token": "test-only-oidc" } }),
    };
    assert.equal(aiReady(), true);
    const status = await GET().json();
    assert.equal(status.available, true);
    assert.ok(!JSON.stringify(status).includes("test-only-oidc"));

    globals[contextKey] = { get: () => ({}) };
    process.env.AI_GATEWAY_API_KEY = "test-only-api-key";
    assert.equal(aiReady(), true);
    delete process.env.AI_GATEWAY_API_KEY;
    process.env.VERCEL_OIDC_TOKEN = "test-only-local-oidc";
    assert.equal(aiReady(), true);
  } finally {
    if (previousContext === undefined) delete globals[contextKey];
    else globals[contextKey] = previousContext;
    for (const [key, value] of Object.entries({
      AI_GATEWAY_API_KEY: previousKey,
      VERCEL_OIDC_TOKEN: previousToken,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
