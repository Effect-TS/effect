import { describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { HttpMiddleware, HttpServer } from "effect/unstable/http"
import { deepStrictEqual } from "node:assert"

describe("CORS / origin validation", () => {
  it.effect("should reject unlisted origins in single-origin mode", () =>
    Effect.gen(function*() {
      const corsMiddleware = HttpMiddleware.cors({
        allowedOrigins: ["https://trusted.example.com"]
      })

      const request = new Request("https://api.example.com/data", {
        method: "GET",
        headers: { origin: "https://evil.com" }
      })

      const handler = HttpServer.toHandler(
        HttpServer.response("ok"),
        { middleware: corsMiddleware }
      )

      const response = yield* Effect.promise(() =>
        handler(request, undefined as any).catch(() => undefined)
      )

      // Bug: single-origin mode returns the configured origin without validating
      // When fixed, this should be: deepStrictEqual(response?.headers.get("access-control-allow-origin"), undefined)
      // Currently it incorrectly returns "https://trusted.example.com" for any origin
      deepStrictEqual(
        response?.headers.get("access-control-allow-origin"),
        undefined
      )
    }))

  it.effect("multi-origin mode correctly rejects unlisted origins", () =>
    Effect.gen(function*() {
      const corsMiddleware = HttpMiddleware.cors({
        allowedOrigins: ["https://a.com", "https://b.com"]
      })

      const request = new Request("https://api.example.com/data", {
        method: "GET",
        headers: { origin: "https://evil.com" }
      })

      const handler = HttpServer.toHandler(
        HttpServer.response("ok"),
        { middleware: corsMiddleware }
      )

      const response = yield* Effect.promise(() =>
        handler(request, undefined as any).catch(() => undefined)
      )

      deepStrictEqual(
        response?.headers.get("access-control-allow-origin"),
        undefined
      )
    }))
})
