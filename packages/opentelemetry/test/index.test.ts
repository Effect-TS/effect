import { assert, describe, it } from "@effect/vitest"
import { vi } from "vitest"

const { missingPeer } = vi.hoisted(() => ({
  missingPeer: (name: string): never => {
    throw Object.assign(new Error(`Cannot find package '${name}'`), { code: "ERR_MODULE_NOT_FOUND" })
  }
}))

vi.mock("@opentelemetry/sdk-trace-node", () => missingPeer("@opentelemetry/sdk-trace-node"))
vi.mock("@opentelemetry/sdk-trace-web", () => missingPeer("@opentelemetry/sdk-trace-web"))

describe("@effect/opentelemetry", () => {
  it("can be imported without the optional trace sdk peers installed", async () => {
    const mod = await import("@effect/opentelemetry")
    assert.isDefined(mod.OtelTracer)
    assert.isDefined(mod.Resource)
  })
})
