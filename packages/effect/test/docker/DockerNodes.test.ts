import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { DockerApi, DockerError, DockerNodes } from "effect/docker"
import { HttpApi, HttpApiBuilder, HttpApiGroup } from "effect/http-api"
import { fakeEngine } from "./utils/fake.ts"

const Served = HttpApi.make("docker").add(
  HttpApiGroup.make("nodes").add(DockerApi.Nodes.endpoints.inspect, DockerApi.Nodes.endpoints.update)
    .middleware(DockerApi.SwarmErrors)
)

let version = 0
const writes: Array<unknown> = []

const Handlers = HttpApiBuilder.group(Served, "nodes", (handlers) =>
  handlers
    .handle("inspect", ({ params }) =>
      Effect.sync(() => ({
        ID: params.id,
        Version: { Index: ++version },
        Spec: { Labels: { seen: String(version) } }
      })))
    .handle("update", ({ payload, query }) =>
      Effect.suspend(() => {
        writes.push({ version: query.version, payload })
        // the first write races another update
        return writes.length === 1
          ? Effect.fail(
            new DockerError.ServerError({ message: "rpc error: code = Unknown desc = update out of sequence" })
          )
          : Effect.void
      })))

describe("DockerNodes", () => {
  it.effect("round-trips DockerApi: modify starts over from a fresh inspect while the update is out of sequence", () =>
    Effect.gen(function*() {
      const nodes = yield* DockerNodes.DockerNodes
      yield* nodes.modify("n1", (spec) => ({ ...spec, Labels: { ...spec.Labels, zone: "a" } }))
      // each write applies `f` to the spec it read, at that version
      assert.deepStrictEqual(writes, [
        { version: 1, payload: { Labels: { seen: "1", zone: "a" } } },
        { version: 2, payload: { Labels: { seen: "2", zone: "a" } } }
      ])
    }).pipe(Effect.provide(fakeEngine(Served, Handlers))))
})
