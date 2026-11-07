import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Layer, Logger, Schema } from "effect"
import { ClusterSchema, Entity } from "effect/cluster"
import { Rpc } from "effect/rpc"
import { VersionedSchema } from "effect/schema"
import { type Backend, make, type RunnerLayer, socketRunnerLayer } from "./harness.ts"

const PersonV1 = VersionedSchema.make("ClusterPerson", {
  version: 1,
  payload: Schema.Struct({ name: Schema.String })
})

const PersonV2 = PersonV1.next({
  version: 2,
  payload: Schema.Struct({ name: Schema.String, email: Schema.optionalKey(Schema.String) }),
  migration: (s) => s.addField("email")
})

const makePeople = <P extends Schema.Top>(person: P) =>
  Entity.make("ClusterVersionedPeople", [
    Rpc.make("Save", { payload: { id: Schema.String, person }, success: person })
  ]).annotateRpcs(ClusterSchema.Persisted, true)

// the same entity as a build before Person v2 and a build after it declare it
const People = makePeople(PersonV1)
const NextPeople = makePeople(PersonV2)

const handled: Array<string> = []

const PeopleLayer = People.toLayer({
  Save: (request) => {
    handled.push(`v1:${request.payload.id}`)
    return Effect.succeed(request.payload.person)
  }
})

const NextPeopleLayer = NextPeople.toLayer({
  Save: (request) => {
    handled.push(`v2:${request.payload.id}`)
    return Effect.succeed(request.payload.person)
  }
})

describe("cluster versioned schema integration", () => {
  for (const backend of ["pg", "mysql"] satisfies ReadonlyArray<Backend>) {
    it.live(`${backend}: a persisted message waits through a rollback for a runner that can read it`, () =>
      Effect.gen(function*() {
        handled.length = 0
        const warnings: Array<string> = []
        const runnerLayer: RunnerLayer = (...args) =>
          socketRunnerLayer(...args).pipe(
            Layer.provide(Logger.layer([
              Logger.make((options) => {
                if (options.logLevel === "Warn") warnings.push(String(options.message))
              })
            ]))
          )
        const cluster = yield* make({ backend, entities: PeopleLayer, runnerLayer })

        // a runner rolled back to the build before Person v2
        const [rolledBack] = yield* cluster.start(1)
        yield* cluster.waitForStableAssignments()

        // a sender still on the newer build
        const client = yield* cluster.getClient(NextPeople)
        const person = { name: "Ada", email: "ada@example.com" }
        const reply = yield* client("ada").Save({ id: `${backend}-ada`, person }).pipe(
          Effect.forkChild({ startImmediately: true })
        )
        yield* cluster.waitUntil(
          "The rolled back runner did not leave the message waiting",
          Effect.sync(() => warnings.some((message) => message.includes("can read ClusterPerson v2")))
        )
        assert.deepStrictEqual(handled, [])
        assert.deepStrictEqual(yield* cluster.messageCounts(), { failed: 0, replied: 0, unprocessed: 1 })

        // A readable request for the same entity must stay behind it.
        const oldClient = yield* cluster.getClient(People)
        const later = yield* oldClient("ada").Save({ id: `${backend}-later`, person: { name: "Grace" } }).pipe(
          Effect.forkChild({ startImmediately: true })
        )
        yield* cluster.waitUntil(
          "The later request was not persisted",
          Effect.map(cluster.unprocessedMessageCount, (count) => count === 2)
        )
        assert.deepStrictEqual(handled, [])

        // rolling forward again delivers both in order, at each sender's versions
        yield* cluster.stop(rolledBack)
        yield* cluster.start(1, { entities: NextPeopleLayer })
        yield* cluster.waitForStableAssignments()
        assert.deepStrictEqual(yield* Fiber.join(reply), person)
        assert.deepStrictEqual(yield* Fiber.join(later), { name: "Grace" })
        assert.deepStrictEqual(handled, [`v2:${backend}-ada`, `v2:${backend}-later`])
        yield* cluster.waitUntil(
          "The reply was not recorded",
          Effect.map(cluster.repliedMessageCount, (value) => value === 2)
        )
        assert.deepStrictEqual(yield* cluster.messageCounts(), { failed: 0, replied: 2, unprocessed: 0 })
      }))
  }
})
