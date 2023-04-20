import { Tag } from "@effect/data/Context"
import * as Effect from "@effect/io/Effect"
import * as _ from "@effect/rpc/Router"
import * as RS from "@effect/rpc/Schema"
import { typeEquals } from "@effect/rpc/test/utils"
import * as S from "@effect/schema/Schema"
import { describe, it } from "vitest"

const makeCounter = () => {
  let count = 0

  return {
    count: () => count++,
  }
}
interface Counter extends ReturnType<typeof makeCounter> {}
const Counter = Tag<Counter>()

const schema = RS.make({
  getCount: {
    output: S.tuple(S.number, S.number),
  },
})

const router = _.make(schema, {
  getCount: Effect.map(
    Counter,
    (counter) => [counter.count(), counter.count()] as const,
  ),
})

describe("Router", () => {
  it("provideServiceSync/", () => {
    typeEquals(router.handlers.getCount)<
      Effect.Effect<Counter, never, readonly [number, number]>
    >() satisfies true

    const provided = _.provideServiceSync(router, Counter, makeCounter)
    typeEquals(provided.handlers.getCount)<
      Effect.Effect<never, never, readonly [number, number]>
    >() satisfies true

    expect(Effect.runSync(provided.handlers.getCount)).toEqual([0, 1])
  })

  it("provideServiceEffect/ error", () => {
    const counterEffect: Effect.Effect<never, Error, Counter> =
      Effect.sync(makeCounter)

    const provided = _.provideServiceEffect(router, Counter, counterEffect)

    typeEquals(provided.handlers.getCount)<
      Effect.Effect<never, Error, readonly [number, number]>
    >() satisfies true

    expect(Effect.runSync(provided.handlers.getCount)).toEqual([0, 1])
  })

  it("provideServiceEffect/ env", () => {
    interface Foo {
      readonly _: unique symbol
    }
    const counterEffect: Effect.Effect<Foo, Error, Counter> =
      Effect.sync(makeCounter)

    const provided = _.provideServiceEffect(router, Counter, counterEffect)
    typeEquals(provided.handlers.getCount)<
      Effect.Effect<Foo, Error, readonly [number, number]>
    >() satisfies true
  })
})
