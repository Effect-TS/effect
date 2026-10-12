import { assert, it } from "@effect/vitest"
import { vi } from "vitest"

vi.mock("redis", () => {
  throw new Error("Cannot find package 'redis'")
})

it("root entry loads without the optional redis peer", async () => {
  const PlatformNode = await import("@effect/platform-node")
  assert.isFunction(PlatformNode.NodeHttpServer.layer)
})
