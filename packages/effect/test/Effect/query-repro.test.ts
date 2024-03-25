import {
  Cause,
  Console,
  Deferred,
  Duration,
  Effect,
  Exit,
  FiberId,
  Layer,
  Option,
  RateLimiter,
  ReadonlyArray,
  Request,
  RequestResolver,
  Schedule
} from "effect"
import { inspect } from "util"

const logRequest = (name: string) => <A, E, R>(eff: Effect.Effect<A, E, R>) =>
  Effect
    .logInfo(`${name} [Start]`)
    .pipe(
      Effect.andThen(eff),
      Effect.tapBoth({
        onFailure: () => Effect.logInfo(`${name} [End fail]`),
        onSuccess: () => Effect.logInfo(`${name} [End Success]`)
      })
    )

function logCacheStats(c: Request.Cache, name: string) {
  return Effect
    .all({
      stats: c.cacheStats,
      entries: c.entries.pipe(
        Effect.andThen(
          Effect
            .forEach(([k, v]) => Deferred.isDone(v.handle).pipe(Effect.andThen((isDone) => [k, isDone, v] as const)))
        ),
        Effect.andThen((entries) =>
          entries.reduce((prev, cur) => {
            return {
              inflight: cur[1] ? prev.inflight : [...prev.inflight, cur[2]],
              finished: cur[1] ? [...prev.finished, cur[2]] : prev.finished
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }, { inflight: [] as Array<any>, finished: [] as Array<any> })
        )
      )
    })
    .pipe(Effect.andThen(({ entries, stats }) =>
      Console
        .log(
          `$$$ cache stats [${name}]: ${
            inspect(stats)
          }. ${entries.finished.length} done, ${entries.inflight.length} in flight.`
        )
        .pipe(Effect.andThen(
          entries
              .inflight
              .length
            ? Console.log(`in-flight requests: ${JSON.stringify(entries.inflight, undefined, 2)}`)
            : Effect.unit
        ))
    ))
}

export class FindIntraday extends Request.TaggedClass("FindIntraday")<
  string | null,
  never,
  {
    symbol: string
  }
> {}

const make = Effect.gen(function*($) {
  const rateLimit = yield* $(RateLimiter.make({ limit: 3, algorithm: "fixed-window", interval: Duration.seconds(1) }))
  const rateLimit2 = yield* $(RateLimiter.make({ limit: 10, algorithm: "fixed-window", interval: Duration.seconds(1) }))

  const intradayCache = yield* $(
    Request.makeCache({ capacity: 500, timeToLive: "8 hours" }).pipe(
      Effect.tap((c) =>
        logCacheStats(c, "intraday2").pipe(
          Effect.schedule(Schedule.spaced("20 seconds")),
          Effect.interruptible,
          Effect.forkScoped
        )
      )
    )
  )

  const FindIntradayRequestResolver = RequestResolver
    .makeBatched((requests: Array<FindIntraday>) =>
      Effect
        .delay(Effect.succeed([] as Array<string>), Duration.millis(25))
        .pipe(rateLimit)
        .pipe(
          Effect
            .andThen((intradays) =>
              Effect.forEach(requests, (r) =>
                Request.complete(
                  r,
                  Exit.succeed(
                    ReadonlyArray
                      .findFirst(intradays, (_) => _ === r.symbol)
                      .pipe(Option.getOrNull)
                  )
                ), { discard: true })
            ),
          Effect.catchAllCause((cause) => {
            console.log("catch all ", cause)
            return Effect.forEach(requests, Request.complete(Exit.failCause(cause)), { discard: true })
          }),
          Effect.onInterrupt(() => {
            console.log("oninterrupt ")
            return Effect.forEach(requests, Request.complete(Exit.failCause(Cause.interrupt(FiberId.none))), {
              discard: true
            })
          })
        )
    )
    .pipe(
      RequestResolver.batchN(100)
    )

  const getIntraday = (symbol: string) =>
    Effect
      .request(new FindIntraday({ symbol }), FindIntradayRequestResolver)
      .pipe(
        Effect.withRequestCaching(true),
        Effect.withRequestCache(intradayCache),
        Effect.withRequestBatching(true),
        logRequest(`MarketStackApiCache: getIntraDay#${symbol}`)
      )

  return { rateLimit, rateLimit2, getIntraday }
})

export class Svc extends Effect.Tag("svc")<Svc, Effect.Effect.Success<typeof make>>() {
  static readonly Live = Layer.scoped(Svc, make)
}

const getSub = (symbol: string) =>
  Effect
    .gen(function*($) {
      const { getIntraday, rateLimit2 } = yield* $(Svc)
      yield* $(
        Effect
          .all([
            Effect
              .delay(Effect.succeed(null), Duration.millis(25))
              .pipe(rateLimit2),
            getIntraday(symbol)
          ], { concurrency: "inherit", batching: true })
      )
    })

export const getItems = Effect
  .forEach(
    ReadonlyArray.range(1, 50).map((_) => `test_${_}`),
    (symbol) => getSub(symbol),
    {
      concurrency: "inherit",
      batching: true
    }
  )
