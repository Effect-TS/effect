import { McpProtocol, type McpServer } from "effect/ai"
import { expect, it } from "tstyche"
import { makeServerLayer } from "../../test/ai/McpServer/TestUtils/McpServerLayer.ts"

it("preserves transport-specific request services in the MCP test helper", () => {
  expect(makeServerLayer({ name: "Default" })).type.toBe<
    ReturnType<typeof McpServer.layerHttp<readonly [typeof McpProtocol.v2025_06_18]>>
  >()
  expect(makeServerLayer({ name: "Stateful", protocols: [McpProtocol.v2025_11_25] })).type.toBe<
    ReturnType<typeof McpServer.layerHttp<readonly [typeof McpProtocol.v2025_11_25]>>
  >()
  expect(makeServerLayer({ name: "Mixed", protocols: [McpProtocol.v2025_11_25, McpProtocol.v2026_07_28] })).type.toBe<
    ReturnType<typeof McpServer.layerHttp<readonly [typeof McpProtocol.v2025_11_25, typeof McpProtocol.v2026_07_28]>>
  >()
  expect(makeServerLayer({ name: "Request", protocols: [McpProtocol.v2026_07_28], mode: "request" })).type.toBe<
    ReturnType<typeof McpServer.layerHttpRequestScoped<readonly [typeof McpProtocol.v2026_07_28]>>
  >()
})
