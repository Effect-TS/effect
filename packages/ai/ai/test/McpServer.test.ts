import * as McpServer from "@effect/ai/McpServer"
import * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
import { assert, describe, it } from "@effect/vitest"

const ServerLayer = McpServer.layerHttpRouter({
  name: "Test Server",
  version: "1.0.0",
  path: "/mcp"
})

const initialize = () =>
  new Request("http://localhost/mcp", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "probe", version: "0" }
      }
    })
  })

describe("McpServer", () => {
  describe("Streamable HTTP transport", () => {
    it("responds to a single request with a single JSON-RPC object, not a batch array", async () => {
      const { dispose, handler } = HttpLayerRouter.toWebHandler(ServerLayer)

      try {
        const response = await handler(initialize())
        const body = await response.json()

        assert.isFalse(Array.isArray(body))
        assert.strictEqual(body.id, 1)
        assert.strictEqual(body.result.protocolVersion, "2025-06-18")
      } finally {
        await dispose()
      }
    })

    it("answers GET with 405 instead of 404", async () => {
      const { dispose, handler } = HttpLayerRouter.toWebHandler(ServerLayer)

      try {
        const response = await handler(new Request("http://localhost/mcp", { method: "GET" }))

        assert.strictEqual(response.status, 405)
        assert.strictEqual(response.headers.get("allow"), "POST")
      } finally {
        await dispose()
      }
    })
  })
})
