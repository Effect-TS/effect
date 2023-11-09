import * as _ from "@effect/rpc/Router"
import * as RS from "@effect/rpc/Schema"
import { typeEquals } from "@effect/rpc/test/utils"
import * as S from "@effect/schema/Schema"
import { Tag } from "effect/Context"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { describe, expect, it } from "vitest"

const makeCounter = () => {
  let count = 0

  return {
    count: () => count++
  }
}
interface Counter extends ReturnType<typeof makeCounter> {}
const Counter = Tag<Counter>()

const SomeError_ = S.struct({
  _tag: S.literal("SomeError"),
  message: S.string
})
interface SomeError extends S.Schema.To<typeof SomeError_> {}
const SomeError: S.Schema<SomeError> = SomeError_

const posts = RS.make({
  create: {
    output: S.string
  }
})

const schema = RS.withServiceError(
  RS.make({
    getCount: {
      output: S.tuple(S.number, S.number)
    },
    posts
  }),
  SomeError
)

const router = _.make(schema, {
  getCount: Effect.map(
    Counter,
    (counter) => [counter.count(), counter.count()] as const
  ),

  posts: _.make(posts, {
    create: Effect.succeed("post")
  })
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
    const counterEffect: Effect.Effect<never, SomeError, Counter> = Effect.sync(makeCounter)

    const provided = _.provideServiceEffect(router, Counter, counterEffect)

    typeEquals(provided.handlers.getCount)<
      Effect.Effect<never, SomeError, readonly [number, number]>
    >() satisfies true

    expect(Effect.runSync(provided.handlers.getCount)).toEqual([0, 1])
  })

  it("provideServiceEffect/ error fail", () => {
    const counterEffect: Effect.Effect<never, SomeError, Counter> = Effect.fail(
      { _tag: "SomeError", message: "boom" }
    )

    const provided = _.provideServiceEffect(router, Counter, counterEffect)

    expect(Effect.runSync(Effect.either(provided.handlers.getCount))).toEqual(
      Either.left({ _tag: "SomeError", message: "boom" })
    )
  })

  it("provideServiceEffect/ error fail nested", () => {
    const counterEffect: Effect.Effect<never, SomeError, Counter> = Effect.fail(
      { _tag: "SomeError", message: "boom" }
    )

    const provided = _.provideServiceEffect(router, Counter, counterEffect)

    expect(
      Effect.runSync(Effect.either(provided.handlers.posts.handlers.create))
    ).toEqual(Either.left({ _tag: "SomeError", message: "boom" }))
  })

  it("provideServiceEffect/ env", () => {
    interface Foo {
      readonly _: unique symbol
    }
    const counterEffect: Effect.Effect<Foo, SomeError, Counter> = Effect.sync(makeCounter)

    const provided = _.provideServiceEffect(router, Counter, counterEffect)
    typeEquals(provided.handlers.getCount)<
      Effect.Effect<Foo, SomeError, readonly [number, number]>
    >() satisfies true
  })
})
