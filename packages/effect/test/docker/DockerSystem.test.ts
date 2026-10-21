import { assert, describe, it } from "@effect/vitest"
import { Effect, Redacted, Stream } from "effect"
import { DockerError, DockerSystem } from "effect/docker"
import { json, makeStubEngine, withPing } from "./utils/stub.ts"

describe("DockerSystem", () => {
  it.effect("pings on every call, and reports what /_ping says", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.55"))
      const ping = DockerSystem.DockerSystem.use((system) => system.ping)
      const info = yield* Effect.andThen(ping, ping).pipe(stub.provide)
      assert.deepStrictEqual(info, {
        apiVersion: "1.55",
        osType: "linux",
        builderVersion: "2",
        experimental: false,
        swarm: undefined
      })
      // one HEAD to negotiate, then one GET per call
      assert.deepStrictEqual(stub.requests.map((request) => `${request.method} ${request.url.pathname}`), [
        "HEAD /_ping",
        "GET /v1.55/_ping",
        "GET /v1.55/_ping"
      ])
    }))

  it.effect("reports the Swarm state and experimental mode from /_ping", () =>
    Effect.gen(function*() {
      const ping = (headers: Record<string, string>) => {
        const stub = makeStubEngine(() => ({ headers: { "Api-Version": "1.44", ...headers }, body: "OK" }))
        return DockerSystem.DockerSystem.use((system) => system.ping).pipe(
          stub.provide,
          Effect.map(({ experimental, swarm }) => ({ experimental, swarm }))
        )
      }
      assert.deepStrictEqual(
        yield* Effect.all([
          ping({ "Docker-Experimental": "true", "Swarm": "active/manager" }),
          ping({ "Docker-Experimental": "false", "Swarm": "active/worker" }),
          ping({ "Swarm": "locked" }),
          ping({ "Swarm": "inactive" })
        ]),
        [
          { experimental: true, swarm: { nodeState: "active", controlAvailable: true } },
          { experimental: false, swarm: { nodeState: "active", controlAvailable: false } },
          { experimental: false, swarm: { nodeState: "locked", controlAvailable: false } },
          { experimental: false, swarm: { nodeState: "inactive", controlAvailable: false } }
        ]
      )
    }))

  it.effect("decodes events line by line, and fails on a malformed line", () =>
    Effect.gen(function*() {
      const events = (body: string) =>
        Stream.unwrap(DockerSystem.DockerSystem.useSync((system) => system.events())).pipe(
          Stream.runCollect,
          makeStubEngine(withPing("1.44", () => ({ headers: { "content-type": "application/json" }, body }))).provide
        )
      const decoded = yield* events(
        [
          JSON.stringify({ Type: "container", Action: "start", Actor: { ID: "a", Attributes: null } }),
          "",
          JSON.stringify({ Type: "somethingnew", Action: "x" })
        ].join("\r\n") + "\r\n"
      )
      assert.deepStrictEqual(decoded, [
        { Type: "container", Action: "start", Actor: { ID: "a" } },
        { Type: "somethingnew", Action: "x" }
      ])
      const error = yield* Effect.flip(events("{\"Type\":\"container\"}\nnot json\n"))
      assert(error.reason._tag === "InvalidResponse")
      assert.strictEqual(error.reason.operation, "docker.System.events")
    }))

  it.effect("sends since, until and filters as the Engine reads them", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", () => ({ body: "" })))
      yield* Stream.unwrap(DockerSystem.DockerSystem.useSync((system) =>
        system.events({
          since: new Date("2026-10-21T00:00:00.500Z"),
          until: 1792540801000,
          filters: { type: "container", event: ["start", "die"] }
        })
      )).pipe(Stream.runDrain, stub.provide)
      const { searchParams } = stub.requests.at(-1)!.url
      assert.strictEqual(searchParams.get("since"), "1792540800")
      assert.strictEqual(searchParams.get("until"), "1792540801")
      assert.deepStrictEqual(JSON.parse(searchParams.get("filters")!), {
        type: ["container"],
        event: ["start", "die"]
      })
    }))

  it.effect("answers auth with or without a body, redacting the identity token", () =>
    Effect.gen(function*() {
      const ok = makeStubEngine(
        withPing("1.44", () => json({ Status: "Login Succeeded", IdentityToken: "identity-token-value" }))
      )
      const result = yield* DockerSystem.DockerSystem.use((system) =>
        system.auth({ username: "u", password: Redacted.make("p"), serverAddress: "r" })
      ).pipe(ok.provide)
      assert.strictEqual(result?.Status, "Login Succeeded")
      assert(result?.IdentityToken !== undefined)
      assert.strictEqual(Redacted.value(result.IdentityToken), "identity-token-value")
      assert.notInclude(String(result.IdentityToken), "identity-token-value")
      assert.deepStrictEqual(JSON.parse(ok.requests.at(-1)!.body!), {
        username: "u",
        password: "p",
        serveraddress: "r"
      })
      for (const reply of [{ status: 204 }, { status: 200, body: "" }]) {
        const empty = makeStubEngine(withPing("1.44", () => reply))
        assert.isUndefined(
          yield* DockerSystem.DockerSystem.use((system) => system.auth({ username: "u" })).pipe(empty.provide)
        )
      }
    }))

  it.effect("reads the legacy disk usage shape, and gates verbose", () =>
    Effect.gen(function*() {
      const legacy = makeStubEngine(withPing("1.44", () => json({ LayersSize: 10, Images: null, Volumes: [] })))
      const usage = yield* DockerSystem.DockerSystem.use((system) => system.df()).pipe(legacy.provide)
      assert.deepStrictEqual(usage, { LayersSize: 10, Volumes: [] })
      const gated = yield* DockerSystem.DockerSystem.use((system) => system.df({ verbose: true })).pipe(
        legacy.provide,
        Effect.flip
      )
      assert.deepStrictEqual(
        gated.reason,
        new DockerError.OptionNotSupported({ option: "verbose", requiredVersion: "1.52", negotiatedVersion: "1.44" })
      )
    }))

  it.effect("sends build-cache sizes under the Engine's names, and gates them", () =>
    Effect.gen(function*() {
      const prune = (
        apiVersion: string,
        options: Parameters<DockerSystem.DockerSystem["Service"]["pruneBuildCache"]>[0]
      ) => {
        const stub = makeStubEngine(withPing(apiVersion, () => json({ SpaceReclaimed: 1 })))
        return DockerSystem.DockerSystem.use((system) => system.pruneBuildCache(options)).pipe(
          stub.provide,
          Effect.map(() => Object.fromEntries(stub.requests.at(-1)!.url.searchParams))
        )
      }
      assert.deepStrictEqual(yield* prune("1.48", { all: true, reservedSpace: 1, maxUsedSpace: 2, minFreeSpace: 3 }), {
        "all": "true",
        "reserved-space": "1",
        "max-used-space": "2",
        "min-free-space": "3"
      })
      // `keep-storage` is `reserved-space` before API 1.48
      assert.deepStrictEqual(yield* prune("1.44", { all: true, reservedSpace: 1 }), {
        "all": "true",
        "keep-storage": "1"
      })
      const gated = yield* Effect.flip(prune("1.47", { reservedSpace: 1, maxUsedSpace: 2 }))
      assert.deepStrictEqual(
        gated.reason,
        new DockerError.OptionNotSupported({
          option: "maxUsedSpace",
          requiredVersion: "1.48",
          negotiatedVersion: "1.47"
        })
      )
    }))
})
