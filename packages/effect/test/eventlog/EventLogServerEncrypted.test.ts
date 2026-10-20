import { assert, it } from "@effect/vitest"
import { Effect, Exit, Layer } from "effect"
import * as EventLogServerEncrypted from "effect/eventlog/EventLogServerEncrypted"
import * as CompactionTest from "./EventLogServerEncryptedCompactionTest.ts"
import * as EncryptedTest from "./EventLogServerEncryptedTest.ts"

EncryptedTest.suite("memory", EventLogServerEncrypted.layerStorageMemory)
CompactionTest.suite("memory", EventLogServerEncrypted.layerStorageMemoryWith)

it.effect("memory storage fails to start unless grace is longer than the lag and the stage TTL", () =>
  Effect.gen(function*() {
    const start = (compaction: EventLogServerEncrypted.CompactionOptions) =>
      Effect.exit(Effect.scoped(Layer.build(EventLogServerEncrypted.layerStorageMemoryWith({ compaction }))))

    const exits = [
      yield* start({ grace: "24 hours", lag: "24 hours" }),
      yield* start({ grace: "10 minutes", stageTtl: "10 minutes", lag: "1 minute" }),
      yield* start({ grace: "25 hours", lag: "24 hours", stageTtl: "24 hours" })
    ]

    assert.deepStrictEqual(exits.map(Exit.isSuccess), [false, false, true])
  }))
