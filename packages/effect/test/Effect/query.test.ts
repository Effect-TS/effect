import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import * as Array from "effect/Array"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import { seconds } from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as FiberRef from "effect/FiberRef"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Request from "effect/Request"
import * as Resolver from "effect/RequestResolver"
import * as TestClock from "effect/TestClock"
import type { Concurrency } from "effect/Types"

interface Counter {
  readonly _: unique symbol
}
const Counter = Context.GenericTag<Counter, { count: number }>("counter")
interface Requests {
  readonly _: unique symbol
}
const Requests = Context.GenericTag<Requests, { count: number }>("requests")

export const userIds: ReadonlyArray<number> = Array.range(1, 26)

export const userNames: ReadonlyMap<number, string> = new Map(
  Array.zipWith(
    userIds,
    Array.map(Array.range(97, 122), (a) => String.fromCharCode(a)),
    (a, b) => [a, b] as const
  )
)

export type UserRequest = GetAllIds | GetNameById

export interface GetAllIds extends Request.Request<ReadonlyArray<number>> {
  readonly _tag: "GetAllIds"
}

export const GetAllIds = Request.tagged<GetAllIds>("GetAllIds")

export class GetNameById extends Request.TaggedClass("GetNameById")<string, string, {
  readonly id: number
}> {}

const delay = <A, E, R>(self: Effect.Effect<A, E, R>) =>
  Effect.zipRight(
    Effect.promise(() => new Promise((r) => setTimeout(() => r(0), 0))),
    self
  )

const counted = <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.tap(self, () => Effect.map(Counter, (c) => c.count++))

const UserResolver = Resolver.makeBatched((requests: Array<UserRequest>) =>
  Effect.flatMap(Requests, (r) => {
    r.count += requests.length
    return counted(Effect.forEach(requests, (request) => delay(processRequest(request)), { discard: true }))
  })
).pipe(
  Resolver.batchN(15),
  Resolver.contextFromServices(Counter, Requests)
)

export const getAllUserIds = Effect.request(GetAllIds({}), UserResolver)

export const interrupts = FiberRef.unsafeMake({ interrupts: 0 })

export const getUserNameById = (id: number) => Effect.request(new GetNameById({ id }), UserResolver)

export const getUserNameByIdPiped = (id: number) => pipe(new GetNameById({ id }), Effect.request(UserResolver))

export const getAllUserNamesN = (concurrency: Concurrency) =>
  getAllUserIds.pipe(
    Effect.flatMap(Effect.forEach(getUserNameById, { concurrency, batching: true })),
    Effect.onInterrupt(() => FiberRef.getWith(interrupts, (i) => Effect.sync(() => i.interrupts++)))
  )

export const getAllUserNamesPipedN = (concurrency: Concurrency) =>
  getAllUserIds.pipe(
    Effect.flatMap(Effect.forEach(getUserNameById, { concurrency, batching: true })),
    Effect.onInterrupt(() => FiberRef.getWith(interrupts, (i) => Effect.sync(() => i.interrupts++)))
  )

export const getAllUserNames = getAllUserNamesN("unbounded")

export const getAllUserNamesPiped = getAllUserNamesPipedN("unbounded")

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

const processRequest = (request: UserRequest): Effect.Effect<void> => {
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

const UserResolverTagged = Resolver.fromEffectTagged<UserRequest>()({
  GetAllIds: (reqs) =>
    counted(Effect.flatMap(Requests, (_) => {
      _.count += reqs.length
      return Effect.forEach(reqs, () => Effect.succeed(userIds))
    })),
  GetNameById: (reqs) =>
    counted(Effect.flatMap(Requests, (_) => {
      _.count += reqs.length
      return Effect.forEach(reqs, (req) => {
        if (userNames.has(req.id)) {
          const userName = userNames.get(req.id)!
          return Effect.succeed(userName)
        }
        return Effect.fail("Not Found")
      })
    }))
}).pipe(
  Resolver.batchN(15),
  Resolver.contextFromServices(Counter, Requests)
)
export const getAllUserIdsTagged = Effect.request(GetAllIds({}), UserResolverTagged)
export const getUserNameByIdTagged = (id: number) => Effect.request(new GetNameById({ id }), UserResolverTagged)
export const getAllUserNamesTagged = getAllUserIdsTagged.pipe(
  Effect.flatMap(Effect.forEach(getUserNameByIdTagged, { batching: true }))
)

const EnvLive = Layer.mergeAll(
  Layer.sync(Counter, () => ({ count: 0 })),
  Layer.sync(Requests, () => ({ count: 0 }))
).pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      Layer.setRequestCache(Request.makeCache({
        capacity: 100,
        timeToLive: seconds(60)
      })),
      Layer.setRequestCaching(true),
      Layer.setRequestBatching(true)
    )
  )
)

const provideEnv = Effect.provide(EnvLive)

describe("Effect", () => {
  it.effect("avoid false interruption when concurrency happens in resolver", () =>
    Effect.gen(function*() {
      class RequestUserById extends Request.TaggedClass("RequestUserById")<number, never, {
        id: string
      }> {}
      let count = 0
      const resolver = Resolver.makeBatched((i) => {
        count++
        return Effect.forEach(i, Request.complete(Exit.succeed(1)), { concurrency: "unbounded" })
      })
      yield* Effect.request(new RequestUserById({ id: "1" }), resolver).pipe(
        Effect.withRequestCaching(true),
        Effect.repeatN(3)
      )
      strictEqual(count, 1)
    }))
  it.effect("requests are executed correctly", () =>
    provideEnv(
      Effect.gen(function*() {
        const names = yield* getAllUserNames
        const count = yield* Counter
        strictEqual(count.count, 3)
        assertTrue(names.length > 2)
        deepStrictEqual(names, userIds.map((id) => userNames.get(id)))
      })
    ))
  it.effect("requests with dual syntax are executed correctly", () =>
    provideEnv(
      Effect.gen(function*() {
        const names = yield* getAllUserNamesPiped
        const count = yield* Counter
        strictEqual(count.count, 3)
        assertTrue(names.length > 2)
        deepStrictEqual(names, userIds.map((id) => userNames.get(id)))
      })
    ))
  it.effect("requests are executed correctly with fromEffectTagged", () =>
    provideEnv(
      Effect.gen(function*() {
        const names = yield* getAllUserNamesTagged
        const count = yield* Counter
        strictEqual(count.count, 3)
        assertTrue(names.length > 2)
        deepStrictEqual(names, userIds.map((id) => userNames.get(id)))
      })
    ))
  it.effect("batching composes", () =>
    provideEnv(
      Effect.gen(function*() {
        const cache = yield* (FiberRef.get(FiberRef.currentRequestCache))
        yield* (cache.invalidateAll)
        const names = yield* (Effect.zip(getAllUserNames, getAllUserNames, {
          concurrent: true,
          batching: true
        }))
        const count = yield* Counter
        strictEqual(count.count, 3)
        assertTrue(names[0].length > 2)
        deepStrictEqual(names[0], userIds.map((id) => userNames.get(id)))
        deepStrictEqual(names[0], names[1])
      })
    ))
  it.effect("withSpan doesn't break batching", () =>
    provideEnv(
      Effect.gen(function*() {
        yield* pipe(
          Effect.zip(
            getAllUserIds.pipe(Effect.withSpan("A")),
            getAllUserIds.pipe(Effect.withSpan("B")),
            { concurrent: true, batching: true }
          ),
          Effect.withRequestCaching(false)
        )
        const count = yield* Counter
        strictEqual(count.count, 1)
      })
    ))
  it.effect("batching is independent from parallelism", () =>
    provideEnv(
      Effect.gen(function*() {
        const names = yield* (getAllUserNamesN(5))
        const count = yield* Counter
        strictEqual(count.count, 3)
        assertTrue(names.length > 2)
        deepStrictEqual(names, userIds.map((id) => userNames.get(id)))
      })
    ))
  it.effect("batching doesn't break interruption", () =>
    Effect.locally(interrupts, { interrupts: 0 })(
      provideEnv(
        Effect.gen(function*() {
          const exit = yield* pipe(
            getAllUserNames,
            Effect.zipLeft(Effect.interrupt, {
              concurrent: true,
              batching: true
            }),
            Effect.exit
          )
          strictEqual(exit._tag, "Failure")
          if (exit._tag === "Failure") {
            assertTrue(Cause.isInterruptedOnly(exit.cause))
          }
          const cache = yield* (FiberRef.get(FiberRef.currentRequestCache))
          const values = yield* (cache.values)
          strictEqual(values[0].handle.state.current._tag, "Done")
          deepStrictEqual(yield* Counter, { count: 0 })
          deepStrictEqual(yield* (FiberRef.get(interrupts)), { interrupts: 1 })
        })
      )
    ))
  it.effect("requests dont't break interruption", () =>
    Effect.locally(interrupts, { interrupts: 0 })(
      provideEnv(
        Effect.gen(function*() {
          const fiber = yield* pipe(getAllUserNames, Effect.fork)
          yield* (Effect.yieldNow())
          yield* (Fiber.interrupt(fiber))
          const exit = yield* (Fiber.await(fiber))
          strictEqual(exit._tag, "Failure")
          if (exit._tag === "Failure") {
            assertTrue(Cause.isInterruptedOnly(exit.cause))
          }
          deepStrictEqual(yield* Counter, { count: 0 })
          deepStrictEqual(yield* (FiberRef.get(interrupts)), { interrupts: 1 })
        })
      )
    ))
  it.effect("requests work with uninterruptible", () =>
    Effect.locally(interrupts, { interrupts: 0 })(
      provideEnv(
        Effect.gen(function*() {
          const fiber = yield* pipe(getAllUserNames, Effect.uninterruptible, Effect.fork)
          yield* (Effect.yieldNow())
          yield* (Fiber.interrupt(fiber))
          const exit = yield* (Fiber.await(fiber))
          strictEqual(exit._tag, "Failure")
          if (exit._tag === "Failure") {
            assertTrue(Cause.isInterruptedOnly(exit.cause))
          }
          deepStrictEqual(yield* Counter, { count: 3 })
          deepStrictEqual(yield* (FiberRef.get(interrupts)), { interrupts: 0 })
        })
      )
    ))
  it.effect("batching doesn't break interruption when limited", () =>
    Effect.locally(interrupts, { interrupts: 0 })(
      provideEnv(
        Effect.gen(function*() {
          const exit = yield* pipe(
            getAllUserNames,
            Effect.zipLeft(Effect.interrupt, {
              concurrent: true,
              batching: true
            }),
            Effect.exit
          )
          strictEqual(exit._tag, "Failure")
          if (exit._tag === "Failure") {
            assertTrue(Cause.isInterruptedOnly(exit.cause))
          }
          deepStrictEqual(yield* Counter, { count: 0 })
          deepStrictEqual(yield* (FiberRef.get(interrupts)), { interrupts: 1 })
        })
      )
    ))
  it.effect("zip/parallel is not batched when specified", () =>
    provideEnv(
      Effect.gen(function*() {
        const [a, b] = yield* pipe(
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
        const count = yield* Counter
        strictEqual(count.count, 2)
        deepStrictEqual(a, userNames.get(userIds[0]))
        deepStrictEqual(b, userNames.get(userIds[1]))
      })
    ))
  it.effect("zip/parallel is batched by default", () =>
    provideEnv(
      Effect.gen(function*() {
        const [a, b] = yield* (
          Effect.zip(
            getUserNameById(userIds[0]),
            getUserNameById(userIds[1]),
            {
              concurrent: true,
              batching: true
            }
          )
        )
        const count = yield* Counter
        strictEqual(count.count, 1)
        deepStrictEqual(a, userNames.get(userIds[0]))
        deepStrictEqual(b, userNames.get(userIds[1]))
      })
    ))
  it.effect("cache respects ttl", () =>
    provideEnv(
      Effect.gen(function*() {
        yield* getAllUserIds
        yield* getAllUserIds
        deepStrictEqual(yield* Counter, { count: 1 })
        yield* (TestClock.adjust(seconds(10)))
        yield* getAllUserIds
        yield* getAllUserIds
        deepStrictEqual(yield* Counter, { count: 1 })
        yield* (TestClock.adjust(seconds(60)))
        yield* getAllUserIds
        yield* getAllUserIds
        deepStrictEqual(yield* Counter, { count: 2 })
      })
    ))
  it.effect("cache can be warmed up", () =>
    provideEnv(
      Effect.gen(function*() {
        yield* (Effect.cacheRequestResult(GetAllIds({}), Exit.succeed(userIds)))
        yield* getAllUserIds
        yield* getAllUserIds
        deepStrictEqual(yield* Counter, { count: 0 })
        yield* (TestClock.adjust(seconds(65)))
        yield* getAllUserIds
        yield* getAllUserIds
        deepStrictEqual(yield* Counter, { count: 1 })
      })
    ))
  it.effect("cache can be disabled", () =>
    provideEnv(
      Effect.withRequestCaching(false)(Effect.gen(function*() {
        yield* getAllUserIds
        yield* getAllUserIds
        deepStrictEqual(yield* Counter, { count: 2 })
        yield* (TestClock.adjust(seconds(10)))
        yield* getAllUserIds
        yield* getAllUserIds
        deepStrictEqual(yield* Counter, { count: 4 })
        yield* (TestClock.adjust(seconds(60)))
        yield* getAllUserIds
        yield* getAllUserIds
        deepStrictEqual(yield* Counter, { count: 6 })
      }))
    ))

  it.effect("batching preserves individual & identical requests", () =>
    provideEnv(
      Effect.gen(function*() {
        yield* pipe(
          Effect.all([getUserNameById(userIds[0]), getUserNameById(userIds[0])], {
            concurrency: "unbounded",
            batching: true,
            discard: true
          }),
          Effect.withRequestCaching(false)
        )
        const requests = yield* Requests
        const invocations = yield* Counter
        deepStrictEqual(requests.count, 2)
        deepStrictEqual(invocations.count, 1)
      })
    ))
})
