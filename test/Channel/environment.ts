import * as it from "effect-test/utils/extend"
import * as Channel from "effect/Channel"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import { pipe } from "effect/Function"
import * as Hash from "effect/Hash"
import { assert, describe } from "vitest"

const NumberServiceSymbolKey = "effect/test/NumberService"

const NumberServiceTypeId = Symbol.for(NumberServiceSymbolKey)

type NumberServiceTypeId = typeof NumberServiceTypeId

export interface NumberService extends Equal.Equal {
  readonly [NumberServiceTypeId]: NumberServiceTypeId
  readonly n: number
}

export const NumberService = Context.Tag<NumberService>()

export class NumberServiceImpl implements NumberService {
  readonly [NumberServiceTypeId]: NumberServiceTypeId = NumberServiceTypeId

  constructor(readonly n: number) {}

  [Hash.symbol](): number {
    return pipe(
      Hash.hash(NumberServiceSymbolKey),
      Hash.combine(Hash.hash(this.n))
    )
  }

  [Equal.symbol](u: unknown): boolean {
    return isNumberService(u) && u.n === this.n
  }
}

export const isNumberService = (u: unknown): u is NumberService => {
  return typeof u === "object" && u != null && NumberServiceTypeId in u
}

describe.concurrent("Channel", () => {
  it.effect("provide - simple", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        NumberService,
        Channel.provideService(NumberService, new NumberServiceImpl(100)),
        Channel.run
      )
      assert.deepStrictEqual(result, new NumberServiceImpl(100))
    }))

  it.effect("provide -> zip -> provide", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        NumberService,
        Channel.provideService(NumberService, new NumberServiceImpl(100)),
        Channel.zip(
          pipe(
            NumberService,
            Channel.provideService(NumberService, new NumberServiceImpl(200))
          )
        ),
        Channel.run
      )
      assert.deepStrictEqual(result, [new NumberServiceImpl(100), new NumberServiceImpl(200)])
    }))

  it.effect("concatMap(provide).provide", () =>
    Effect.gen(function*($) {
      const [chunk, value] = yield* $(
        Channel.fromEffect(NumberService),
        Channel.emitCollect,
        Channel.mapOut((tuple) => tuple[1]),
        Channel.concatMap((n) =>
          pipe(
            NumberService,
            Effect.map((m) => [n, m] as const),
            Channel.provideService(NumberService, new NumberServiceImpl(200)),
            Channel.flatMap(Channel.write)
          )
        ),
        Channel.provideService(NumberService, new NumberServiceImpl(100)),
        Channel.runCollect
      )
      assert.deepStrictEqual(Array.from(chunk), [[new NumberServiceImpl(100), new NumberServiceImpl(200)] as const])
      assert.isUndefined(value)
    }))

  it.effect("provide is modular", () =>
    Effect.gen(function*($) {
      const channel1 = Channel.fromEffect(NumberService)
      const channel2 = pipe(
        NumberService,
        Effect.provide(pipe(Context.empty(), Context.add(NumberService, new NumberServiceImpl(2)))),
        Channel.fromEffect
      )
      const channel3 = Channel.fromEffect(NumberService)
      const [[result1, result2], result3] = yield* $(
        channel1,
        Channel.zip(channel2),
        Channel.zip(channel3),
        Channel.runDrain,
        Effect.provideService(NumberService, new NumberServiceImpl(4))
      )
      assert.deepStrictEqual(result1, new NumberServiceImpl(4))
      assert.deepStrictEqual(result2, new NumberServiceImpl(2))
      assert.deepStrictEqual(result3, new NumberServiceImpl(4))
    }))
})
