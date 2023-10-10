import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import { seconds } from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as FiberRef from "effect/FiberRef"
import * as timeout from "effect/internal/timeout"
import * as Layer from "effect/Layer"
import * as ReadonlyArray from "effect/ReadonlyArray"
import * as Request from "effect/Request"
import * as Resolver from "effect/RequestResolver"
import * as TestClock from "effect/TestClock"
import type { Concurrency } from "effect/Types"

interface Counter {
  readonly _: unique symbol
}
const Counter = Context.Tag<Counter, { count: number }>()
interface Requests {
  readonly _: unique symbol
}
const Requests = Context.Tag<Requests, { count: number }>()

export const userIds: ReadonlyArray<number> = ReadonlyArray.range(1, 26)

export const userNames: ReadonlyMap<number, string> = new Map(
  ReadonlyArray.zipWith(
    userIds,
    ReadonlyArray.map(ReadonlyArray.range(97, 122), (a) => String.fromCharCode(a)),
    (a, b) => [a, b] as const
  )
)

export type UserRequest = GetAllIds | GetNameById

export interface GetAllIds extends Request.Request<never, ReadonlyArray<number>> {
  readonly _tag: "GetAllIds"
}

export const GetAllIds = Request.tagged<GetAllIds>("GetAllIds")

export interface GetNameById extends Request.Request<string, string> {
  readonly _tag: "GetNameById"
  readonly id: number
}

export const GetNameById = Request.tagged<GetNameById>("GetNameById")

const delay = <R, E, A>(self: Effect.Effect<R, E, A>) =>
  Effect.zipRight(
    Effect.promise(() => new Promise((r) => timeout.set(() => r(0), 0))),
    self
  )

const counted = <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.tap(self, () => Effect.map(Counter, (c) => c.count++))

const UserResolver = Resolver.makeBatched((requests: Array<UserRequest>) => {
  return Effect.flatMap(Requests, (r) => {
    r.count += requests.length
    return counted(Effect.forEach(requests, (request) => delay(processRequest(request)), { discard: true }))
  })
}).pipe(
  Resolver.batchN(15),
  Resolver.contextFromServices(Counter, Requests)
)

export const getAllUserIds = Effect.request(GetAllIds({}), UserResolver)

export const interrupts = FiberRef.unsafeMake({ interrupts: 0 })

export const getUserNameById = (id: number) => Effect.request(GetNameById({ id }), UserResolver)

export const getAllUserNamesN = (concurrency: Concurrency) =>
  getAllUserIds.pipe(
    Effect.flatMap(Effect.forEach(getUserNameById, { concurrency, batching: true })),
    Effect.onInterrupt(() => FiberRef.getWith(interrupts, (i) => Effect.sync(() => i.interrupts++)))
  )

export const getAllUserNames = getAllUserNamesN("unbounded")

export const print = (request: UserRequest): string => {
  switch (request._tag) {
    case "GetAllIds": {
      return request._tag
    }
    case "GetNameById": {
      return `${request._tag}(${request.id})`
    }
  }
}

const processRequest = (request: UserRequest): Effect.Effect<never, never, void> => {
  switch (request._tag) {
    case "GetAllIds": {
      return Request.complete(request, Exit.succeed(userIds))
    }
    case "GetNameById": {
      if (userNames.has(request.id)) {
        const userName = userNames.get(request.id)!
        return Request.complete(request, Exit.succeed(userName))
      }
      return Request.completeEffect(request, Exit.fail("Not Found"))
    }
  }
}

const EnvLive = Layer.provideMerge(
  Layer.mergeAll(
    Layer.setRequestCache(Request.makeCache({
      capacity: 100,
      timeToLive: seconds(60)
    })),
    Layer.setRequestCaching(true),
    Layer.setRequestBatching(true)
  ),
  Layer.mergeAll(
    Layer.sync(Counter, () => ({ count: 0 })),
    Layer.sync(Requests, () => ({ count: 0 }))
  )
)

const provideEnv = Effect.provide(EnvLive)

describe.concurrent("Effect", () => {
  it.effect("requests are executed correctly", () =>
    provideEnv(
      Effect.gen(function*($) {
        const names = yield* $(getAllUserNames)
        const count = yield* $(Counter)
        expect(count.count).toEqual(3)
        expect(names.length).toBeGreaterThan(2)
        expect(names).toEqual(userIds.map((id) => userNames.get(id)))
      })
    ))
  it.effect("batching composes", () =>
    provideEnv(
      Effect.gen(function*($) {
        const cache = yield* $(FiberRef.get(FiberRef.currentRequestCache))
        yield* $(cache.invalidateAll())
        const names = yield* $(Effect.zip(getAllUserNames, getAllUserNames, {
          concurrent: true,
          batching: true
        }))
        const count = yield* $(Counter)
        expect(count.count).toEqual(3)
        expect(names[0].length).toBeGreaterThan(2)
        expect(names[0]).toEqual(userIds.map((id) => userNames.get(id)))
        expect(names[0]).toEqual(names[1])
      })
    ))
  it.effect("withSpan doesn't break batching", () =>
    provideEnv(
      Effect.gen(function*($) {
        yield* $(
          Effect.zip(
            getAllUserIds.pipe(Effect.withSpan("A")),
            getAllUserIds.pipe(Effect.withSpan("B")),
            { concurrent: true, batching: true }
          ),
          Effect.withRequestCaching(false)
        )
        const count = yield* $(Counter)
        expect(count.count).toEqual(1)
      })
    ))
  it.effect("batching is independent from parallelism", () =>
    provideEnv(
      Effect.gen(function*($) {
        const names = yield* $(getAllUserNamesN(5))
        const count = yield* $(Counter)
        expect(count.count).toEqual(3)
        expect(names.length).toBeGreaterThan(2)
        expect(names).toEqual(userIds.map((id) => userNames.get(id)))
      })
    ))
  it.effect("batching doesn't break interruption", () =>
    Effect.locally(interrupts, { interrupts: 0 })(
      provideEnv(
        Effect.gen(function*($) {
          const exit = yield* $(
            getAllUserNames,
            Effect.zipLeft(Effect.interrupt, {
              concurrent: true,
              batching: true
            }),
            Effect.exit
          )
          expect(exit._tag).toEqual("Failure")
          if (exit._tag === "Failure") {
            expect(Cause.isInterruptedOnly(exit.cause)).toEqual(true)
          }
          expect(yield* $(Counter)).toEqual({ count: 0 })
          expect(yield* $(FiberRef.get(interrupts))).toEqual({ interrupts: 1 })
        })
      )
    ))
  it.effect("requests dont't break interruption", () =>
    Effect.locally(interrupts, { interrupts: 0 })(
      provideEnv(
        Effect.gen(function*($) {
          const fiber = yield* $(getAllUserNames, Effect.fork)
          yield* $(Effect.yieldNow())
          yield* $(Fiber.interrupt(fiber))
          const exit = yield* $(Fiber.await(fiber))
          expect(exit._tag).toEqual("Failure")
          if (exit._tag === "Failure") {
            expect(Cause.isInterruptedOnly(exit.cause)).toEqual(true)
          }
          expect(yield* $(Counter)).toEqual({ count: 0 })
          expect(yield* $(FiberRef.get(interrupts))).toEqual({ interrupts: 1 })
        })
      )
    ))
  it.effect("requests work with uninterruptible", () =>
    Effect.locally(interrupts, { interrupts: 0 })(
      provideEnv(
        Effect.gen(function*($) {
          const fiber = yield* $(getAllUserNames, Effect.uninterruptible, Effect.fork)
          yield* $(Effect.yieldNow())
          yield* $(Fiber.interrupt(fiber))
          const exit = yield* $(Fiber.await(fiber))
          expect(exit._tag).toEqual("Failure")
          if (exit._tag === "Failure") {
            expect(Cause.isInterruptedOnly(exit.cause)).toEqual(true)
          }
          expect(yield* $(Counter)).toEqual({ count: 3 })
          expect(yield* $(FiberRef.get(interrupts))).toEqual({ interrupts: 0 })
        })
      )
    ))
  it.effect("batching doesn't break interruption when limited", () =>
    Effect.locally(interrupts, { interrupts: 0 })(
      provideEnv(
        Effect.gen(function*($) {
          const exit = yield* $(
            getAllUserNames,
            Effect.zipLeft(Effect.interrupt, {
              concurrent: true,
              batching: true
            }),
            Effect.exit
          )
          expect(exit._tag).toEqual("Failure")
          if (exit._tag === "Failure") {
            expect(Cause.isInterruptedOnly(exit.cause)).toEqual(true)
          }
          expect(yield* $(Counter)).toEqual({ count: 0 })
          expect(yield* $(FiberRef.get(interrupts))).toEqual({ interrupts: 1 })
        })
      )
    ))
  it.effect("zip/parallel is not batched when specified", () =>
    provideEnv(
      Effect.gen(function*($) {
        const [a, b] = yield* $(
          Effect.zip(
            getUserNameById(userIds[0]),
            getUserNameById(userIds[1]),
            {
              concurrent: true,
              batching: false
            }
          ),
          Effect.withRequestBatching(true)
        )
        const count = yield* $(Counter)
        expect(count.count).toEqual(2)
        expect(a).toEqual(userNames.get(userIds[0]))
        expect(b).toEqual(userNames.get(userIds[1]))
      })
    ))
  it.effect("zip/parallel is batched by default", () =>
    provideEnv(
      Effect.gen(function*($) {
        const [a, b] = yield* $(
          Effect.zip(
            getUserNameById(userIds[0]),
            getUserNameById(userIds[1]),
            {
              concurrent: true,
              batching: true
            }
          )
        )
        const count = yield* $(Counter)
        expect(count.count).toEqual(1)
        expect(a).toEqual(userNames.get(userIds[0]))
        expect(b).toEqual(userNames.get(userIds[1]))
      })
    ))
  it.effect("cache respects ttl", () =>
    provideEnv(
      Effect.gen(function*($) {
        yield* $(getAllUserIds)
        yield* $(getAllUserIds)
        expect(yield* $(Counter)).toEqual({ count: 1 })
        yield* $(TestClock.adjust(seconds(10)))
        yield* $(getAllUserIds)
        yield* $(getAllUserIds)
        expect(yield* $(Counter)).toEqual({ count: 1 })
        yield* $(TestClock.adjust(seconds(60)))
        yield* $(getAllUserIds)
        yield* $(getAllUserIds)
        expect(yield* $(Counter)).toEqual({ count: 2 })
      })
    ))
  it.effect("cache can be warmed up", () =>
    provideEnv(
      Effect.gen(function*($) {
        yield* $(Effect.cacheRequestResult(GetAllIds({}), Exit.succeed(userIds)))
        yield* $(getAllUserIds)
        yield* $(getAllUserIds)
        expect(yield* $(Counter)).toEqual({ count: 0 })
        yield* $(TestClock.adjust(seconds(65)))
        yield* $(getAllUserIds)
        yield* $(getAllUserIds)
        expect(yield* $(Counter)).toEqual({ count: 1 })
      })
    ))
  it.effect("cache can be disabled", () =>
    provideEnv(
      Effect.withRequestCaching(false)(Effect.gen(function*($) {
        yield* $(getAllUserIds)
        yield* $(getAllUserIds)
        expect(yield* $(Counter)).toEqual({ count: 2 })
        yield* $(TestClock.adjust(seconds(10)))
        yield* $(getAllUserIds)
        yield* $(getAllUserIds)
        expect(yield* $(Counter)).toEqual({ count: 4 })
        yield* $(TestClock.adjust(seconds(60)))
        yield* $(getAllUserIds)
        yield* $(getAllUserIds)
        expect(yield* $(Counter)).toEqual({ count: 6 })
      }))
    ))

  it.effect("batching preserves individual & identical requests", () =>
    provideEnv(
      Effect.gen(function*($) {
        yield* $(
          Effect.all([getUserNameById(userIds[0]), getUserNameById(userIds[0])], {
            concurrency: "unbounded",
            batching: true,
            discard: true
          }),
          Effect.withRequestCaching(false)
        )
        const requests = yield* $(Requests)
        const invocations = yield* $(Counter)
        expect(requests.count).toEqual(2)
        expect(invocations.count).toEqual(1)
      })
    ))
})
