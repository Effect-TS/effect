import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { DockerNodes } from "effect/docker"
import { json, makeStubEngine, withPing } from "./utils/stub.ts"

const Nodes = DockerNodes.DockerNodes

describe("DockerNodes", () => {
  it.effect("sends each request as the Engine reads it", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", (request) =>
        request.method === "GET"
          ? json(request.url.pathname.endsWith("/nodes") ? [{ ID: "n1" }] : { ID: "n1", Version: { Index: 3 } })
          : {}))
      const [list, node] = yield* Nodes.use((nodes) =>
        Effect.all([
          nodes.list({ filters: { role: "manager" } }),
          nodes.inspect("n1"),
          nodes.update("n1", { Availability: "drain", Labels: { zone: "a" } }, { version: 3 }),
          nodes.remove("n1", { force: true })
        ])
      ).pipe(stub.provide)
      assert.deepStrictEqual([list, node], [[{ ID: "n1" }], { ID: "n1", Version: { Index: 3 } }])
      assert.deepStrictEqual(
        stub.requests.slice(1).map((request) => `${request.method} ${request.url.pathname}${request.url.search}`),
        [
          `GET /v1.44/nodes?filters=${encodeURIComponent(JSON.stringify({ role: ["manager"] }))}`,
          "GET /v1.44/nodes/n1",
          "POST /v1.44/nodes/n1/update?version=3",
          "DELETE /v1.44/nodes/n1?force=true"
        ]
      )
      assert.deepStrictEqual(JSON.parse(stub.requests[3].body!), { Availability: "drain", Labels: { zone: "a" } })
    }))

  it.effect("modify starts over from a fresh inspect while the update is out of sequence, at most 5 times", () =>
    Effect.gen(function*() {
      const outOfSequence = json({ message: "rpc error: code = Unknown desc = update out of sequence" }, 500)
      const run = (updates: ReadonlyArray<ReturnType<typeof json>>) => {
        let inspects = 0
        let writes = 0
        const stub = makeStubEngine(withPing("1.44", (request) =>
          request.method === "GET"
            ? json({ ID: "n1", Version: { Index: ++inspects }, Spec: { Labels: { seen: String(inspects) } } })
            : updates[writes++] ?? {}))
        return Nodes.use((nodes) => nodes.modify("n1", (spec) => ({ ...spec, Labels: { ...spec.Labels, zone: "a" } })))
          .pipe(stub.provide, Effect.exit, Effect.map((exit) => ({ exit, stub })))
      }
      const retried = yield* run([outOfSequence, outOfSequence])
      assert.strictEqual(retried.exit._tag, "Success")
      const writes = retried.stub.requests.filter((request) => request.method === "POST")
      // each write applies `f` to the spec it read, at that version
      assert.deepStrictEqual(writes.map((request) => [request.url.search, JSON.parse(request.body!)]), [
        ["?version=1", { Labels: { seen: "1", zone: "a" } }],
        ["?version=2", { Labels: { seen: "2", zone: "a" } }],
        ["?version=3", { Labels: { seen: "3", zone: "a" } }]
      ])
      const invalid = yield* run([json({ message: "invalid spec" }, 400)])
      assert(invalid.exit._tag === "Failure")
      assert.strictEqual(invalid.stub.requests.filter((request) => request.method === "POST").length, 1)
      const busy = yield* run(Array.from({ length: 10 }, () => outOfSequence))
      assert(busy.exit._tag === "Failure")
      assert.strictEqual(busy.stub.requests.filter((request) => request.method === "POST").length, 5)
    }))

  it.effect("fails with SwarmUnavailable on a node that isn't a manager", () =>
    Effect.gen(function*() {
      const stub = makeStubEngine(withPing("1.44", () => json({ message: "This node is not a swarm manager." }, 503)))
      const error = yield* Effect.flip(Nodes.use((nodes) => nodes.list())).pipe(stub.provide)
      assert.strictEqual(error.reason._tag, "SwarmUnavailable")
    }))
})
