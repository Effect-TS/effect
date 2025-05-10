import { describe, it } from "@effect/vitest"
import { strictEqual } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Request from "effect/Request"
import * as RequestResolver from "effect/RequestResolver"

export class FindIntraday extends Request.TaggedClass("FindIntraday")<string | null, never, { symbol: string }> {}

const make = Effect.sync(function() {
  const getIntradayResolver = RequestResolver.makeBatched((requests: Array<FindIntraday>) =>
    Effect.all(requests.map(Request.succeed(null)))
  )

  const getIntraday = (symbol: string) =>
    Effect.withRequestCaching(true)(
      Effect.request(new FindIntraday({ symbol }), getIntradayResolver)
    )

  return { getIntraday }
})

class Svc extends Effect.Tag("svc")<Svc, Effect.Effect.Success<typeof make>>() {
  static readonly Live = Layer.scoped(Svc, make)
}

const getSub = (symbol: string) =>
  Effect.all([
    Effect.sleep("20 millis"),
    Svc.getIntraday(symbol)
  ], { concurrency: 2, batching: true })

const getItems = getSub("test_1")

describe("interruption", () => {
  it.live("forEach interrupts residual requests", () =>
    Effect.gen(function*() {
      const exit = yield* getItems.pipe(
        Effect.timeout("10 millis"),
        Effect.catchAll(() => getItems),
        Effect.provide(Svc.Live),
        Effect.exit
      )
      strictEqual(exit._tag, "Success")
    }))
})
