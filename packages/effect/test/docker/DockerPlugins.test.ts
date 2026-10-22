import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted, Stream } from "effect"
import { DockerPlugins } from "effect/docker"
import { json, makeStubEngine, ndjson, type Recorded, type Reply, withPing } from "./utils/stub.ts"

const Plugins = DockerPlugins.DockerPlugins

const privileges = [{ Name: "network", Description: "permissions to access a network", Value: ["host"] }]

/** The JSON of a padded base64url header. */
const decodeHeader = (value: string) => JSON.parse(Buffer.from(value, "base64url").toString())

const describeRequest = (request: Recorded) =>
  `${request.method} ${decodeURIComponent(request.url.pathname)}${decodeURIComponent(request.url.search)}`

/** An Engine that answers each plugin endpoint as Docker does, with `pull` and `enable` replaceable. */
const engine = (options?: { readonly pull?: Reply; readonly enable?: Reply }) =>
  makeStubEngine(
    withPing("1.44", (request): Reply => {
      const path = request.url.pathname
      if (path.endsWith("/privileges")) return json(privileges)
      if (path.endsWith("/pull")) {
        return options?.pull ?? {
          ...ndjson({ status: "Pulling from vieux/sshfs" }),
          headers: { "content-type": "application/json", "docker-plugin-name": "sshfs:latest" }
        }
      }
      if (path.endsWith("/enable")) return options?.enable ?? {}
      if (path.endsWith("/set") || path.endsWith("/create")) return { status: 204 }
      if (path.endsWith("/push")) {
        return ndjson({ status: "Preparing" }, { aux: { Tag: "latest", Digest: "sha256:d", Size: 1 } })
      }
      if (path.endsWith("/upgrade")) return ndjson({ status: "Complete" })
      return {}
    }),
    { config: { auths: { "localhost:5000": { username: "u", password: Redacted.make("p") } } } }
  )

describe("DockerPlugins", () => {
  it.effect("sends each request as the Engine reads it, with the resolved registry credential", () =>
    Effect.gen(function*() {
      const stub = engine()
      const tar = Stream.make(new Uint8Array([1, 2, 3]))
      const result = yield* Plugins.use((plugins) =>
        Effect.gen(function*() {
          yield* plugins.privileges("localhost:5000/sshfs")
          yield* Stream.runDrain(plugins.pull("localhost:5000/sshfs", { privileges, name: "sshfs" }))
          yield* plugins.set("sshfs", ["DEBUG=1", Redacted.make("TOKEN=t")])
          yield* plugins.enable("sshfs", { timeout: 5 })
          yield* plugins.disable("sshfs", { force: true })
          yield* Stream.runDrain(plugins.upgrade("sshfs", "localhost:5000/sshfs:2", { privileges }))
          yield* plugins.create("localhost:5000/made:1", tar)
          const pushed = yield* plugins.push("localhost:5000/made:1")
          yield* plugins.remove("sshfs", { force: true })
          return pushed
        })
      ).pipe(stub.provide)
      assert.deepStrictEqual(result, { Tag: "latest", Digest: "sha256:d", Size: 1 })
      const requests = stub.requests.slice(1)
      assert.deepStrictEqual(requests.map(describeRequest), [
        "GET /v1.44/plugins/privileges?remote=localhost:5000/sshfs",
        "POST /v1.44/plugins/pull?remote=localhost:5000/sshfs&name=sshfs",
        "POST /v1.44/plugins/sshfs/set",
        "POST /v1.44/plugins/sshfs/enable?timeout=5",
        "POST /v1.44/plugins/sshfs/disable?force=true",
        "POST /v1.44/plugins/sshfs/upgrade?remote=localhost:5000/sshfs:2",
        "POST /v1.44/plugins/create?name=localhost:5000/made:1",
        "POST /v1.44/plugins/localhost:5000/made:1/push",
        "DELETE /v1.44/plugins/sshfs?force=true"
      ])
      for (const index of [0, 1, 5, 7]) {
        assert.deepStrictEqual(decodeHeader(requests[index].headers["x-registry-auth"]), {
          username: "u",
          password: "p",
          serveraddress: "localhost:5000"
        })
      }
      assert.deepStrictEqual(JSON.parse(requests[1].body!), privileges)
      assert.deepStrictEqual(JSON.parse(requests[2].body!), ["DEBUG=1", "TOKEN=t"])
      assert.deepStrictEqual(requests[6].bytes, new Uint8Array([1, 2, 3]))
      assert.strictEqual(requests[6].headers["content-type"], "application/x-tar")
    }))

  it.effect("fails a pull with StreamFailed on the Engine's in-band error", () =>
    Effect.gen(function*() {
      const stub = engine({
        pull: ndjson(
          { status: "Downloading" },
          { error: "incorrect privileges", errorDetail: { message: "incorrect privileges" } }
        )
      })
      const error = yield* Effect.flip(
        Plugins.use((plugins) => Stream.runDrain(plugins.pull("vieux/sshfs", { privileges: [] })))
      ).pipe(stub.provide)
      assert(error.reason._tag === "StreamFailed")
      assert.strictEqual(error.reason.message, "incorrect privileges")
    }))

  it.effect("install pulls with the accepted privileges, configures, enables, and returns the installed name", () =>
    Effect.gen(function*() {
      const stub = engine()
      const asked: Array<unknown> = []
      const name = yield* Plugins.use((plugins) =>
        plugins.install("vieux/sshfs", {
          accept: (privileges) => Effect.sync(() => asked.push(privileges)).pipe(Effect.as(privileges)),
          args: ["DEBUG=1"]
        })
      ).pipe(stub.provide)
      assert.strictEqual(name, "sshfs:latest")
      assert.deepStrictEqual(asked, [privileges])
      assert.deepStrictEqual(stub.requests.slice(1).map(describeRequest), [
        "GET /v1.44/plugins/privileges?remote=vieux/sshfs",
        "POST /v1.44/plugins/pull?remote=vieux/sshfs",
        "POST /v1.44/plugins/sshfs:latest/set",
        "POST /v1.44/plugins/sshfs:latest/enable?timeout=0"
      ])
    }))

  it.effect("install pulls nothing when accept refuses, and removes the plugin when a later step fails", () =>
    Effect.gen(function*() {
      const refused = engine()
      const refusal = yield* Effect.flip(
        Plugins.use((plugins) => plugins.install("vieux/sshfs", { accept: () => Effect.fail("refused" as const) }))
      ).pipe(refused.provide)
      assert.strictEqual(refusal, "refused")
      assert.isFalse(refused.requests.some((request) => request.url.pathname.endsWith("/pull")))

      const failing = engine({ enable: json({ message: "dial unix verify.sock: no such file or directory" }, 500) })
      const error = yield* Effect.flip(
        Plugins.use((plugins) => plugins.install("vieux/sshfs", { accept: Effect.succeed }))
      ).pipe(failing.provide)
      assert(typeof error !== "string" && error.reason._tag === "ServerError")
      assert.strictEqual(describeRequest(failing.requests.at(-1)!), "DELETE /v1.44/plugins/sshfs:latest?force=true")
    }))
})
