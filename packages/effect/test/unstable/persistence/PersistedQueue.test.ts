import { assert, it } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import { TestClock } from "effect/testing"
import { PersistedQueue } from "effect/unstable/persistence"
import * as PersistedQueueTest from "./PersistedQueueTest.ts"

PersistedQueueTest.suite("memory", PersistedQueue.layerStoreMemory)

const Item = Schema.Struct({ value: Schema.Number })

it.effect("custom ids are deduplicated independently in each queue", () =>
  Effect.gen(function*() {
    const first = yield* PersistedQueue.make({ name: "first", schema: Item })
    const second = yield* PersistedQueue.make({ name: "second", schema: Item })
    yield* first.offer({ value: 1 }, { id: "shared" })
    yield* second.offer({ value: 2 }, { id: "shared" })

    const fiber = yield* second.take(Effect.succeed).pipe(Effect.forkScoped)
    yield* TestClock.adjust("10 millis")

    assert.isDefined(fiber.pollUnsafe())
  }).pipe(
    Effect.scoped,
    Effect.provide(PersistedQueue.layer.pipe(Layer.provide(PersistedQueue.layerStoreMemory)))
  ))
