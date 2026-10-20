import { assert, describe, it } from "@effect/vitest"
import { Context, Data, Deferred, Effect, Exit, Fiber, Option, Request, RequestResolver } from "effect"
import type { Tracer } from "effect"

class Key extends Data.Class<{ id: number }> {}
class GetValue extends Request.Class<{ key: Key }, number> {}
class Tenant extends Context.Service<Tenant, string>()("test/RequestResolver/Tenant") {}
class GetTenant extends Request.Class<{ id: number }, string> {}

const currentTenant = Effect.map(Effect.serviceOption(Tenant), Option.getOrElse(() => "missing"))

describe("RequestResolver.fromEffect", () => {
  it.effect("runs each entry with its caller context", () =>
    Effect.gen(function*() {
      const resolver = RequestResolver.fromEffect<GetTenant>(() => currentTenant)
      const values = yield* Effect.all([
        Effect.request(new GetTenant({ id: 1 }), resolver).pipe(Effect.provideService(Tenant, "first")),
        Effect.request(new GetTenant({ id: 2 }), resolver).pipe(Effect.provideService(Tenant, "second"))
      ], { concurrency: "unbounded" })

      assert.deepStrictEqual(values, ["first", "second"])
    }))

  it.effect("does not inherit a service absent from the caller context", () =>
    Effect.gen(function*() {
      const resolver = RequestResolver.fromEffect<GetTenant>(() => currentTenant)
      const values = yield* Effect.all([
        Effect.request(new GetTenant({ id: 1 }), resolver).pipe(Effect.provideService(Tenant, "private-tenant")),
        Effect.request(new GetTenant({ id: 2 }), resolver)
      ], { concurrency: "unbounded" })

      assert.deepStrictEqual(values, ["private-tenant", "missing"])
    }))

  for (const merge of ["merge", "mergeAll"] as const) {
    for (const position of ["first", "second"] as const) {
      it.effect(`isolates callers when the current context is the ${position} operand of Context.${merge}`, () =>
        Effect.gen(function*() {
          class Wrapper extends Context.Service<Wrapper, string>()("test/RequestResolver/MergeWrapper") {}
          const base = RequestResolver.fromEffect<GetTenant>(() =>
            Effect.gen(function*() {
              const tenant = yield* currentTenant
              const wrapper = yield* Effect.map(Effect.serviceOption(Wrapper), Option.getOrElse(() => "missing"))
              return `${tenant}:${wrapper}`
            })
          )
          const batches: Array<number> = []
          const resolver = RequestResolver.makeWith({
            ...base,
            runAll: (entries, key) => {
              batches.push(entries.length)
              return Effect.updateContext(base.runAll(entries, key), (context) => {
                const wrapper = Context.make(Wrapper, "wrapper")
                const [first, second] = position === "first" ? [context, wrapper] : [wrapper, context]
                return merge === "merge" ? Context.merge(first, second) : Context.mergeAll(first, second)
              })
            }
          })
          const values = yield* Effect.all([
            Effect.request(new GetTenant({ id: 1 }), resolver).pipe(Effect.provideService(Tenant, "private-tenant")),
            Effect.request(new GetTenant({ id: 2 }), resolver)
          ], { concurrency: "unbounded" })

          assert.deepStrictEqual(batches, [2])
          assert.deepStrictEqual(values, ["private-tenant:wrapper", "missing:wrapper"])
        }))
    }
  }

  it.effect("preserves resolver services and span over caller spans without leaking caller services", () =>
    Effect.gen(function*() {
      class Wrapper extends Context.Service<Wrapper, string>()("test/RequestResolver/Wrapper") {}
      class ContextWrapper extends Context.Service<ContextWrapper, string>()("test/RequestResolver/ContextWrapper") {}
      const additions = Array.from({ length: 10 }, (_, i) => Context.Service<number>(`test/RequestResolver/Added${i}`))
      class GetContext extends Request.Class<
        { id: number },
        { tenant: string; wrapper: string; contextWrapper: string; additions: Array<number>; span: string }
      > {}
      const base = RequestResolver.fromEffect<GetContext>(() =>
        Effect.gen(function*() {
          return {
            tenant: yield* currentTenant,
            wrapper: yield* Effect.map(Effect.serviceOption(Wrapper), Option.getOrElse(() => "missing")),
            contextWrapper: yield* Effect.map(Effect.serviceOption(ContextWrapper), Option.getOrElse(() => "missing")),
            additions: yield* Effect.forEach(
              additions,
              (service) => Effect.map(Effect.serviceOption(service), Option.getOrElse(() => -1))
            ),
            span: (yield* Effect.orDie(Effect.currentSpan)).name
          }
        })
      )
      const batches: Array<number> = []
      const resolver = RequestResolver.makeWith({
        ...base,
        runAll: (entries, key) => {
          batches.push(entries.length)
          let effect = base.runAll(entries, key).pipe(
            Effect.provideService(Wrapper, "wrapper"),
            Effect.provideContext(Context.make(ContextWrapper, "context-wrapper"))
          )
          // Enough nested additions to cross Context's overlay-flattening threshold.
          for (let i = 0; i < additions.length; i++) {
            effect = Effect.provideService(effect, additions[i], i)
          }
          return effect
        }
      }).pipe(RequestResolver.withSpan("resolver"))
      const values = yield* Effect.all([
        Effect.request(new GetContext({ id: 1 }), resolver).pipe(
          Effect.provideService(Tenant, "private-tenant"),
          Effect.provideService(Wrapper, "wrapper"),
          Effect.provideService(ContextWrapper, "context-wrapper"),
          Effect.withSpan("first-caller")
        ),
        Effect.request(new GetContext({ id: 2 }), resolver).pipe(
          Effect.provideService(Wrapper, "caller"),
          Effect.provideService(ContextWrapper, "caller"),
          Effect.withSpan("second-caller")
        )
      ], { concurrency: "unbounded" })

      assert.deepStrictEqual(values, [
        {
          tenant: "private-tenant",
          wrapper: "wrapper",
          contextWrapper: "context-wrapper",
          additions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
          span: "resolver"
        },
        {
          tenant: "missing",
          wrapper: "wrapper",
          contextWrapper: "context-wrapper",
          additions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
          span: "resolver"
        }
      ])
      assert.deepStrictEqual(batches, [2])
    }))
})

for (const constructor of ["make", "makeGrouped"] as const) {
  describe(`RequestResolver.${constructor}`, () => {
    it.effect("uses the first caller context whether the batch reaches its cutoff or not", () =>
      Effect.gen(function*() {
        const runAll = (entries: ReadonlyArray<Request.Entry<GetTenant>>) =>
          Effect.map(currentTenant, (tenant) => {
            const value = `${tenant}:${entries.map((entry) => entry.request.id).join(",")}`
            for (const entry of entries) entry.completeUnsafe(Exit.succeed(value))
          })
        const resolver = (constructor === "make"
          ? RequestResolver.make<GetTenant>(runAll)
          : RequestResolver.makeGrouped<GetTenant, string>({ key: () => "shared", resolver: runAll }))
          .pipe(RequestResolver.batchN(2))
        const values = yield* Effect.all([
          Effect.request(new GetTenant({ id: 1 }), resolver).pipe(Effect.provideService(Tenant, "first")),
          Effect.request(new GetTenant({ id: 2 }), resolver).pipe(Effect.provideService(Tenant, "second")),
          Effect.request(new GetTenant({ id: 3 }), resolver).pipe(Effect.provideService(Tenant, "third"))
        ], { concurrency: "unbounded" })

        assert.deepStrictEqual(values, ["first:1,2", "first:1,2", "third:3"])
      }))
  })
}

describe("RequestResolver.makeGrouped", () => {
  it.effect("keeps equal keys batched across derived resolvers and releases them before the next window", () =>
    Effect.gen(function*() {
      const gate = yield* Deferred.make<void>()
      const batches: Array<{ key: Key; size: number }> = []
      const resolver = RequestResolver.makeGrouped<GetValue, Key>({
        key: ({ request }) => request.key,
        resolver: (entries, key) =>
          Effect.sync(() => {
            batches.push({ key, size: entries.length })
            for (const entry of entries) entry.completeUnsafe(Exit.succeed(key.id))
          })
      }).pipe(RequestResolver.setDelayEffect(Effect.andThen(Effect.yieldNow, Deferred.await(gate))))
      const first = yield* Effect.request(new GetValue({ key: new Key({ id: 1 }) }), resolver).pipe(
        Effect.forkChild({ startImmediately: true })
      )
      // Running a derived resolver must not split the delayed resolver's pending batch.
      yield* Effect.request(new GetValue({ key: new Key({ id: 1 }) }), RequestResolver.batchN(resolver, 1))
      const rest = yield* Effect.forEach(
        [1, 2],
        (id) =>
          Effect.request(new GetValue({ key: new Key({ id }) }), resolver).pipe(
            Effect.forkChild({ startImmediately: true })
          )
      )
      yield* Deferred.succeed(gate, undefined)
      const values = yield* Effect.forEach([first, ...rest], Fiber.join)
      assert.deepStrictEqual(values, [1, 1, 2])
      assert.deepStrictEqual(batches.map(({ size }) => size), [1, 2, 1])

      const next = new Key({ id: 1 })
      yield* Effect.request(new GetValue({ key: next }), resolver)
      assert.strictEqual(batches[3].key, next)
    }))

  it.effect("releases the key when the last pending request is interrupted", () =>
    Effect.gen(function*() {
      const keys: Array<Key> = []
      const resolver = RequestResolver.makeGrouped<GetValue, Key>({
        key: ({ request }) => request.key,
        resolver: (entries, key) =>
          Effect.sync(() => {
            keys.push(key)
            for (const entry of entries) entry.completeUnsafe(Exit.succeed(key.id))
          })
      })
      const fiber = yield* Effect.request(new GetValue({ key: new Key({ id: 1 }) }), resolver).pipe(
        Effect.forkChild({ startImmediately: true })
      )
      yield* Fiber.interrupt(fiber)
      const next = new Key({ id: 1 })
      yield* Effect.request(new GetValue({ key: next }), resolver)

      assert.strictEqual(keys.length, 1)
      assert.strictEqual(keys[0], next)
    }))
})

describe("RequestResolver.withSpan", () => {
  it.effect("applies span options returned by an options function", () =>
    Effect.gen(function*() {
      class GetSpan extends Request.Class<{ kind: "client" | "server" }, Tracer.Span> {}
      const resolver = RequestResolver.fromEffect<GetSpan>(() => Effect.orDie(Effect.currentSpan)).pipe(
        RequestResolver.withSpan("resolver", (entries) => ({ kind: entries[0].request.kind }))
      )
      const span = yield* Effect.request(new GetSpan({ kind: "client" }), resolver)

      assert.strictEqual(span.kind, "client")
    }))
})
