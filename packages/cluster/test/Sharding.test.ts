import * as Entity from "@effect/cluster/Entity"
import * as Sharding from "@effect/cluster/Sharding"
import * as Schema from "@effect/schema/Schema"
import { describe, it } from "@effect/vitest"
import { SubscriptionRef } from "effect"
import * as Effect from "effect/Effect"
import * as Number from "effect/Number"
import * as PrimaryKey from "effect/PrimaryKey"

class GetCount extends Schema.TaggedRequest<GetCount>()("GetCount", {
  success: Schema.Int,
  failure: Schema.Never,
  payload: { id: Schema.NonEmptyTrimmedString }
}) {
  [PrimaryKey.symbol]() {
    return this.id
  }
}

class IncrementCounter extends Schema.TaggedRequest<IncrementCounter>()("IncrementCounter", {
  success: Schema.Void,
  failure: Schema.Never,
  payload: { id: Schema.NonEmptyTrimmedString }
}) {
  [PrimaryKey.symbol]() {
    return this.id
  }
}

class DecrementCounter extends Schema.TaggedRequest<DecrementCounter>()("DecrementCounter", {
  success: Schema.Void,
  failure: Schema.Never,
  payload: { id: Schema.NonEmptyTrimmedString }
}) {
  [PrimaryKey.symbol]() {
    return this.id
  }
}

const CounterEntity = Entity.make("Counter", [GetCount, IncrementCounter, DecrementCounter])

const CounterBehavior: Entity.Entity.GetBehavior<typeof CounterEntity> = (mailbox, replier) =>
  Effect.gen(function*() {
    const state = yield* SubscriptionRef.make(0)

    function handleMessage(message: GetCount | IncrementCounter | DecrementCounter) {
      switch (message._tag) {
        case "GetCount": {
          return SubscriptionRef.get(state).pipe(
            Effect.flatMap((count) => replier.succeed(message, count))
          )
        }
        case "IncrementCounter": {
          return SubscriptionRef.update(state, Number.increment).pipe(
            Effect.zipRight(replier.succeed(message, void 0))
          )
        }
        case "DecrementCounter": {
          return SubscriptionRef.update(state, Number.decrement).pipe(
            Effect.zipRight(replier.succeed(message, void 0))
          )
        }
      }
    }

    return yield* mailbox.take.pipe(
      Effect.flatMap((entry) => handleMessage(entry.message)),
      Effect.forever
    )
  })

describe("Sharding", () => {
  it.effect("should send messages to entities", () =>
    Effect.gen(function*() {
      const sharding = yield* Sharding.Sharding

      yield* sharding.registerEntity(CounterEntity, CounterBehavior)
    }))
})
