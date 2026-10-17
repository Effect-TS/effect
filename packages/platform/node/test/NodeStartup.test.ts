import { assert, describe, it } from "@effect/vitest"
import { execFileSync } from "node:child_process"

// Vitest (and other tests) may already have loaded undici. Each scenario must
// start in a fresh Node process, without an ESM import of node:http in the probe.
const startupModules = (code: string): ReadonlyArray<string> =>
  JSON.parse(execFileSync(process.execPath, [
    "--input-type=module",
    "--eval",
    `
      import assert from "node:assert/strict"
      const undiciModules = () => process.moduleLoadList.filter((name) => /undici/i.test(name))
      assert.deepEqual(undiciModules(), [], "probe must start without undici")
      ${code}
    `
  ], { cwd: new URL("..", import.meta.url), encoding: "utf8", timeout: 10_000 }))

describe("Node startup", () => {
  it("imports Schema without loading undici", () => {
    assert.deepStrictEqual(
      startupModules(`
      await import("effect/Schema")
      console.log(JSON.stringify(undiciModules()))
    `),
      []
    )
  })

  it("starts an HTTP server without loading undici before the first request", () => {
    assert.deepStrictEqual(
      startupModules(`
      const { createRequire } = await import("node:module")
      const { createServer } = createRequire(import.meta.url)("node:http")
      const { NodeHttpServer } = await import("@effect/platform-node")
      const Effect = await import("effect/Effect")
      const Layer = await import("effect/Layer")
      const HttpRouter = await import("effect/http/HttpRouter")
      const HttpServerResponse = await import("effect/http/HttpServerResponse")
      const server = createServer()
      await Effect.runPromise(Effect.scoped(Effect.gen(function*() {
        yield* HttpRouter.serve(
          HttpRouter.add("GET", "/", HttpServerResponse.text("ok")),
          { disableListenLog: true, disableLogger: true }
        ).pipe(
          Layer.provide(NodeHttpServer.layer(() => server, { host: "127.0.0.1", port: 0 })),
          Layer.build
        )
        assert.equal(server.listening, true)
        console.log(JSON.stringify(undiciModules()))
      })))
    `),
      []
    )
  })
})
