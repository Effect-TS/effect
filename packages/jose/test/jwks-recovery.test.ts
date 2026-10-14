import { Jwks, Jws } from "@effect/jose"
import { assert, it } from "@effect/vitest"
import { Clock, Context, Deferred, Effect, Exit, Fiber, Layer, Redacted, Scheduler, Scope } from "effect"
import { HttpClient, HttpClientError, HttpClientResponse } from "effect/http"
import { TestClock } from "effect/testing"
import * as jose from "jose"
import { cryptoLayer, privateJwk, publicJwk, utf8 } from "./fixtures.ts"

// Selection/snapshot and failed-response cases adapt panva/jose's
// test/jwks/{local,remote}.test.ts. Effect-specific lifetime cases exercise the
// public service with controlled external HTTP, without mocking its cache.
it.effect("rejects malformed local sets while allowing an empty set", () =>
  Effect.gen(function*() {
    for (
      const input of [
        null,
        {},
        { keys: null },
        { keys: [null] },
        { keys: Array(1) },
        { keys: [{ ...publicJwk, use: 0 }] },
        { keys: [{ ...publicJwk, key_ops: ["verify", 0] }] }
      ]
    ) {
      assert.strictEqual(
        (yield* Jwks.Jwks.pipe(Effect.provide(Jwks.layerLocal(input)), Effect.flip))._tag,
        "JoseInvalidKey"
      )
    }
    const empty = yield* Jwks.Jwks.pipe(Effect.provide(Jwks.layerLocal({ keys: [] })))

    assert.strictEqual((yield* empty.resolve({ algorithm: "ES256" }).pipe(Effect.flip))._tag, "JoseKeyNotFound")
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("captures local key-set authority without freezing the caller's input", () =>
  Effect.gen(function*() {
    const input = { keys: [{ ...publicJwk, kid: "original", key_ops: ["verify"] }] }
    const set = yield* Jwks.Jwks.pipe(Effect.provide(Jwks.layerLocal(input)))

    input.keys[0].kid = "changed"
    input.keys[0].key_ops[0] = "sign"
    input.keys.length = 0
    assert.deepStrictEqual((yield* set.resolve({ algorithm: "ES256", kid: "original" })).jwk, {
      ...publicJwk,
      kid: "original",
      key_ops: ["verify"]
    })
    assert.strictEqual(
      (yield* set.resolve({ algorithm: "ES256", kid: "changed" }).pipe(Effect.flip))._tag,
      "JoseKeyNotFound"
    )
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("does not select a key by inherited metadata", () =>
  Effect.gen(function*() {
    const key = { ...publicJwk }

    Object.setPrototypeOf(key, { kid: "inherited" })
    const set = yield* Jwks.Jwks.pipe(Effect.provide(Jwks.layerLocal({ keys: [key] })))

    assert.strictEqual(
      (yield* set.resolve({ algorithm: "ES256", kid: "inherited" }).pipe(Effect.flip))._tag,
      "JoseKeyNotFound"
    )
    assert.deepStrictEqual((yield* set.resolve({ algorithm: "ES256" })).jwk, publicJwk)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("keeps captured key selection independent of later prototype changes", () =>
  Effect.gen(function*() {
    const set = yield* Jwks.Jwks.pipe(Effect.provide(Jwks.layerLocal({ keys: [publicJwk] })))
    const previous = Object.getOwnPropertyDescriptor(Object.prototype, "kid")

    yield* Effect.acquireRelease(
      Effect.sync(() =>
        Reflect.defineProperty(Object.prototype, "kid", {
          value: "inherited-later",
          writable: true,
          configurable: true
        })
      ),
      () =>
        Effect.sync(() => {
          if (previous === undefined) Reflect.deleteProperty(Object.prototype, "kid")
          else Reflect.defineProperty(Object.prototype, "kid", previous)
        })
    )
    assert.strictEqual(
      (yield* set.resolve({ algorithm: "ES256", kid: "inherited-later" }).pipe(Effect.flip))._tag,
      "JoseKeyNotFound"
    )
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("does not import keys supplied by an inherited array slot", () =>
  Effect.gen(function*() {
    const keys: Array<unknown> = []

    keys.length = 1
    Object.setPrototypeOf(keys, [publicJwk])
    assert.strictEqual(
      (yield* Jwks.Jwks.pipe(Effect.provide(Jwks.layerLocal({ keys })), Effect.flip))._tag,
      "JoseInvalidKey"
    )
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("captures set and key metadata getters once before key selection", () =>
  Effect.gen(function*() {
    let sets = 0
    let kids = 0
    let operations = 0

    const input = {
      get keys() {
        sets++

        return [
          {
            ...publicJwk,
            get kid() {
              return kids++ === 0 ? "one" : "changed"
            },
            get key_ops() {
              return operations++ === 0 ? ["verify"] : ["sign"]
            }
          }
        ]
      }
    }

    const set = yield* Jwks.Jwks.pipe(Effect.provide(Jwks.layerLocal(input)))

    assert.strictEqual((yield* set.resolve({ algorithm: "ES256", kid: "one" })).jwk.kid, "one")
    assert.deepStrictEqual([sets, kids, operations], [1, 1, 1])
    assert.strictEqual(
      (yield* Jwks.Jwks.pipe(
        Effect.provide(
          Jwks.layerLocal({
            keys: [
              {
                ...publicJwk,
                get kid() {
                  throw undefined
                }
              }
            ]
          })
        ),
        Effect.flip
      ))._tag,
      "JoseInvalidKey"
    )
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("selects each asymmetric algorithm by key family even when kids overlap", () =>
  Effect.gen(function*() {
    const rsa = yield* Effect.promise(() => jose.generateKeyPair("RS256", { extractable: true }))
    const rsaPrivate = yield* Effect.promise(() => jose.exportJWK(rsa.privateKey))
    const rsaPublic = yield* Effect.promise(() => jose.exportJWK(rsa.publicKey))
    const ed = yield* Effect.promise(() => jose.generateKeyPair("EdDSA", { extractable: true }))
    const edPrivate = yield* Effect.promise(() => jose.exportJWK(ed.privateKey))
    const edPublic = yield* Effect.promise(() => jose.exportJWK(ed.publicKey))
    const keys = [rsaPublic, edPublic, publicJwk].map((key) => ({ ...key, kid: "shared" }))

    for (
      const [algorithm, jwk] of [
        ["RS256", rsaPrivate],
        ["PS256", rsaPrivate],
        ["ES256", privateJwk],
        ["EdDSA", edPrivate]
      ] as const
    ) {
      const signing = yield* Effect.promise(() => jose.importJWK(jwk, algorithm))

      const token = yield* Effect.promise(() =>
        new jose.CompactSign(utf8(algorithm))
          .setProtectedHeader({ alg: algorithm, kid: "shared" })
          .sign(signing)
      )

      const verified = yield* Jws.verifyWithKeySet(Redacted.make(token), {
        algorithms: [algorithm]
      }).pipe(Effect.provide(Jwks.layerLocal({ keys })))

      assert.deepStrictEqual(Redacted.value(verified.payload), utf8(algorithm))
    }
  }).pipe(Effect.provide(cryptoLayer)))

it.effect.each(
  [
    { failure: "transport", reason: "transport" },
    { failure: "status", reason: "response" },
    { failure: "JSON", reason: "response" },
    { failure: "key set", reason: "response" }
  ] as const
)(
  "recovers from a shared $failure failure without serving expired keys",
  ({ failure, reason }) =>
    Effect.gen(function*() {
      let requests = 0
      let failing = true
      const entered = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()
      const document = JSON.stringify({ keys: [{ ...publicJwk, kid: "one" }] })

      const client = HttpClient.make((request) =>
        Effect.gen(function*() {
          requests++
          if (requests > 1 && failing) {
            yield* Deferred.succeed(entered, undefined)
            yield* Deferred.await(release)
            if (failure === "transport") {
              return yield* new HttpClientError.HttpClientError({
                reason: new HttpClientError.TransportError({
                  request,
                  cause: "private-transport-canary"
                })
              })
            }

            let body = document
            if (failure === "JSON") {
              body = "{"
            } else if (failure === "key set") {
              body = "{\"keys\":null}"
            }
            return HttpClientResponse.fromWeb(
              request,
              new Response(body, { status: failure === "status" ? 503 : 200 })
            )
          }

          return HttpClientResponse.fromWeb(request, new Response(document))
        })
      )

      const context = yield* Layer.build(
        Jwks.layerRemote({
          url: "https://issuer.example/keys",
          cacheTimeMs: 100,
          cooldownMs: 10
        }).pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, client)))
      )

      const set = Context.get(context, Jwks.Jwks)

      assert.strictEqual((yield* set.resolve({ algorithm: "ES256", kid: "one" })).jwk.kid, "one")
      yield* TestClock.adjust(99)
      assert.strictEqual((yield* set.resolve({ algorithm: "ES256", kid: "one" })).jwk.kid, "one")
      assert.strictEqual(requests, 1)
      yield* TestClock.adjust(1)

      const first = yield* Effect.forkChild(
        set.resolve({ algorithm: "ES256", kid: "one" }).pipe(Effect.flip),
        { startImmediately: true }
      )

      const second = yield* Effect.forkChild(
        set.resolve({ algorithm: "ES256", kid: "one" }).pipe(Effect.flip),
        { startImmediately: true }
      )

      yield* Deferred.await(entered)
      yield* Deferred.succeed(release, undefined)
      const error = yield* Fiber.join(first)

      assert.deepInclude(error, { _tag: "JoseJwksUnavailable", reason })
      assert.deepInclude(yield* Fiber.join(second), { _tag: "JoseJwksUnavailable", reason })
      assert.notInclude(JSON.stringify(error), "private-transport-canary")
      assert.strictEqual(requests, 2)
      assert.deepInclude(yield* set.resolve({ algorithm: "ES256", kid: "one" }).pipe(Effect.flip), {
        _tag: "JoseJwksUnavailable",
        reason: "cooldown"
      })
      assert.strictEqual(requests, 2)
      failing = false
      yield* TestClock.adjust(10)
      assert.strictEqual((yield* set.resolve({ algorithm: "ES256", kid: "one" })).jwk.kid, "one")
      assert.strictEqual(requests, 3)
    }).pipe(Effect.provide(cryptoLayer))
)

// Reproduced at 5199d99: callers passed the pending check before yielding to
// Clock, then each started a GET. Gate that read through the public Clock service.
it.effect("coalesces lookups that interleave during refresh admission", () =>
  Effect.gen(function*() {
    let requests = 0
    let arrivals = 0
    const arrived = yield* Deferred.make<void>()
    const release = yield* Deferred.make<void>()
    const clock = yield* Clock.Clock

    const client = HttpClient.make((request) =>
      Effect.sync(() => {
        requests++

        return HttpClientResponse.fromWeb(
          request,
          new Response(JSON.stringify({ keys: [publicJwk] }))
        )
      })
    )

    const context = yield* Layer.build(
      Jwks.layerRemote({ url: "https://issuer.example/keys", cooldownMs: 0 }).pipe(
        Layer.provide(Layer.succeed(HttpClient.HttpClient, client))
      )
    )

    const set = Context.get(context, Jwks.Jwks)

    const lookups = yield* Effect.forEach([0, 1], () => {
      let reads = 0

      const controlled: Clock.Clock = {
        currentTimeMillis: Effect.gen(function*() {
          if (++reads === 2) {
            if (++arrivals === 2) yield* Deferred.succeed(arrived, undefined)
            yield* Deferred.await(release)
          }

          return yield* clock.currentTimeMillis
        }),
        currentTimeMillisUnsafe: () => clock.currentTimeMillisUnsafe(),
        currentTimeNanos: clock.currentTimeNanos,
        currentTimeNanosUnsafe: () => clock.currentTimeNanosUnsafe(),
        monotonicTimeNanos: clock.monotonicTimeNanos,
        monotonicTimeNanosUnsafe: () => clock.monotonicTimeNanosUnsafe(),
        sleep: (duration) => clock.sleep(duration)
      }

      return Effect.forkChild(
        set.resolve({ algorithm: "ES256" }).pipe(Effect.provideService(Clock.Clock, controlled))
      )
    })

    yield* Deferred.await(arrived)
    yield* Deferred.succeed(release, undefined)
    const keys = yield* Effect.forEach(lookups, Fiber.join)

    assert.deepStrictEqual(keys.map((key) => key.jwk), [publicJwk, publicJwk])
    assert.strictEqual(requests, 1)
  }).pipe(Effect.provide(cryptoLayer)))

// Reproduced at 5199d99: closing during the admission Clock read missed the
// not-yet-published Deferred; the later fork into the closed Scope never ran.
it.effect("completes a lookup when its Scope closes during refresh admission", () =>
  Effect.gen(function*() {
    let requests = 0
    const completed = yield* Deferred.make<void>()

    const scope = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))

    const client = HttpClient.make(() =>
      Effect.sync(() => {
        requests++
      }).pipe(Effect.andThen(Effect.never))
    )

    const context = yield* Layer.buildWithScope(
      Jwks.layerRemote({ url: "https://issuer.example/keys" }).pipe(
        Layer.provide(Layer.succeed(HttpClient.HttpClient, client))
      ),
      scope
    )

    const clock = yield* Clock.Clock
    let reads = 0

    const controlled: Clock.Clock = {
      currentTimeMillis: Effect.gen(function*() {
        if (++reads === 2) yield* Scope.close(scope, Exit.void)

        return yield* clock.currentTimeMillis
      }),
      currentTimeMillisUnsafe: () => clock.currentTimeMillisUnsafe(),
      currentTimeNanos: clock.currentTimeNanos,
      currentTimeNanosUnsafe: () => clock.currentTimeNanosUnsafe(),
      monotonicTimeNanos: clock.monotonicTimeNanos,
      monotonicTimeNanosUnsafe: () => clock.monotonicTimeNanosUnsafe(),
      sleep: (duration) => clock.sleep(duration)
    }

    const lookup = yield* Effect.forkChild(
      Context.get(context, Jwks.Jwks)
        .resolve({ algorithm: "ES256" })
        .pipe(
          Effect.provideService(Clock.Clock, controlled),
          Effect.flip,
          Effect.tap(() => Deferred.succeed(completed, undefined))
        ),
      { startImmediately: true }
    )

    // The child has completed or suspended when startImmediately returns.
    assert.strictEqual(yield* Deferred.isDone(completed), true)
    assert.deepInclude(yield* Fiber.join(lookup), {
      _tag: "JoseJwksUnavailable",
      reason: "closed"
    })
    assert.strictEqual(requests, 0)
  }).pipe(
    Effect.provideService(Scheduler.PreventSchedulerYield, true),
    Effect.provide(cryptoLayer)
  ))

it.effect("uses a fresh cache after a delayed cache-miss decision", () =>
  Effect.gen(function*() {
    let requests = 0
    const entered = yield* Deferred.make<void>()
    const release = yield* Deferred.make<void>()
    const clock = yield* Clock.Clock
    let reads = 0

    const controlled: Clock.Clock = {
      currentTimeMillis: Effect.gen(function*() {
        if (++reads === 2) {
          yield* Deferred.succeed(entered, undefined)
          yield* Deferred.await(release)
        }

        return yield* clock.currentTimeMillis
      }),
      currentTimeMillisUnsafe: () => clock.currentTimeMillisUnsafe(),
      currentTimeNanos: clock.currentTimeNanos,
      currentTimeNanosUnsafe: () => clock.currentTimeNanosUnsafe(),
      monotonicTimeNanos: clock.monotonicTimeNanos,
      monotonicTimeNanosUnsafe: () => clock.monotonicTimeNanosUnsafe(),
      sleep: (duration) => clock.sleep(duration)
    }

    const client = HttpClient.make((request) =>
      Effect.sync(() => {
        requests++

        return HttpClientResponse.fromWeb(
          request,
          new Response(JSON.stringify({ keys: [publicJwk] }))
        )
      })
    )

    const context = yield* Layer.build(
      Jwks.layerRemote({ url: "https://issuer.example/keys" }).pipe(
        Layer.provide(Layer.succeed(HttpClient.HttpClient, client))
      )
    )

    const set = Context.get(context, Jwks.Jwks)

    const delayed = yield* Effect.forkChild(
      set.resolve({ algorithm: "ES256" }).pipe(Effect.provideService(Clock.Clock, controlled))
    )

    yield* Deferred.await(entered)
    assert.deepStrictEqual((yield* set.resolve({ algorithm: "ES256" })).jwk, publicJwk)
    yield* Deferred.succeed(release, undefined)
    assert.deepStrictEqual((yield* Fiber.join(delayed)).jwk, publicJwk)
    assert.strictEqual(requests, 1)
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("orders refresh publication with owner shutdown", () =>
  Effect.gen(function*() {
    let requests = 0
    let reads = 0
    let publishing = false
    let steps = 0
    let lookupId: number | undefined
    let paused = false
    let released = false
    const tasks: Array<() => void> = []
    const outcomes: Array<string> = []
    const scheduler = yield* Scheduler.Scheduler
    const dispatcher = scheduler.makeDispatcher()

    const controlledScheduler: Scheduler.Scheduler = {
      executionMode: scheduler.executionMode,
      shouldYield: (fiber) => {
        // Installed Effect: step 26 pauses the old Ref implementation between
        // clearing pending and Deferred.done. Never pause result consumption:
        // ambiguous selection completes synchronously once publication occurs.
        if (publishing && fiber.id !== lookupId && ++steps === 26) {
          paused = true

          return true
        }

        return false
      },
      makeDispatcher: () => ({
        scheduleTask: (task, priority) => {
          if (paused && !released) tasks.push(task)
          else dispatcher.scheduleTask(task, priority)
        },
        flush: () => dispatcher.flush()
      })
    }

    const clock = yield* Clock.Clock

    const controlledClock: Clock.Clock = {
      currentTimeMillis: Effect.sync(() => {
        if (++reads === 3) publishing = true

        return 0
      }),
      currentTimeMillisUnsafe: () => clock.currentTimeMillisUnsafe(),
      currentTimeNanos: clock.currentTimeNanos,
      currentTimeNanosUnsafe: () => clock.currentTimeNanosUnsafe(),
      monotonicTimeNanos: clock.monotonicTimeNanos,
      monotonicTimeNanosUnsafe: () => clock.monotonicTimeNanosUnsafe(),
      sleep: (duration) => clock.sleep(duration)
    }

    const scope = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))

    const client = HttpClient.make((request) =>
      Effect.sync(() => {
        requests++

        return HttpClientResponse.fromWeb(
          request,
          new Response(JSON.stringify({ keys: [publicJwk, publicJwk] }))
        )
      })
    )

    const context = yield* Layer.buildWithScope(
      Jwks.layerRemote({ url: "https://issuer.example/keys" }).pipe(
        Layer.provide(Layer.succeed(HttpClient.HttpClient, client))
      ),
      scope
    )

    const set = Context.get(context, Jwks.Jwks)

    const lookup = yield* Effect.forkChild(
      Effect.gen(function*() {
        lookupId = yield* Effect.fiberId

        return yield* set.resolve({ algorithm: "ES256" })
      }).pipe(
        Effect.provideService(Clock.Clock, controlledClock),
        Effect.provideService(Scheduler.Scheduler, controlledScheduler),
        Effect.flip,
        Effect.tap((error) =>
          Effect.sync(() => {
            outcomes.push(
              `lookup:${error._tag === "JoseJwksUnavailable" ? error.reason : error._tag}`
            )
          })
        )
      )
    )

    for (;;) {
      if (paused || outcomes.length > 0) break
      yield* Effect.yieldNow
    }
    const unpublished = outcomes.length === 0

    const closing = yield* Effect.forkChild(
      Scope.close(scope, Exit.void).pipe(
        Effect.provideService(Scheduler.PreventSchedulerYield, true)
      ),
      { startImmediately: true }
    )

    const probe = yield* Effect.forkChild(
      set.resolve({ algorithm: "ES256" }).pipe(
        Effect.flip,
        Effect.tap((error) =>
          Effect.sync(() => {
            outcomes.push(
              `probe:${error._tag === "JoseJwksUnavailable" ? error.reason : error._tag}`
            )
          })
        ),
        Effect.provideService(Scheduler.PreventSchedulerYield, true)
      ),
      { startImmediately: true }
    )

    released = true
    for (const task of tasks) task()
    yield* Fiber.join(closing)
    const error = yield* Fiber.join(lookup)

    assert.deepInclude(yield* Fiber.join(probe), {
      _tag: "JoseJwksUnavailable",
      reason: "closed"
    })
    assert.strictEqual(paused && unpublished, true)
    assert.strictEqual(requests, 1)
    if (error._tag === "JoseAmbiguousKey") {
      assert.deepStrictEqual(outcomes, ["lookup:JoseAmbiguousKey", "probe:closed"])
    } else {
      assert.includeMembers(outcomes, ["lookup:closed", "probe:closed"])
    }
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("bounds waiters and lets one cancel without interrupting the shared refresh", () =>
  Effect.gen(function*() {
    let requests = 0
    let interrupted = false
    const entered = yield* Deferred.make<void>()
    const release = yield* Deferred.make<void>()

    const client = HttpClient.make((request) =>
      Effect.gen(function*() {
        requests++
        yield* Deferred.succeed(entered, undefined)
        yield* Deferred.await(release)

        return HttpClientResponse.fromWeb(
          request,
          new Response(JSON.stringify({ keys: [publicJwk] }))
        )
      }).pipe(
        Effect.onInterrupt(() =>
          Effect.sync(() => {
            interrupted = true
          })
        )
      )
    )

    const context = yield* Layer.build(
      Jwks.layerRemote({
        url: "https://issuer.example/keys",
        maxWaiters: 2
      }).pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, client)))
    )

    const set = Context.get(context, Jwks.Jwks)

    const first = yield* Effect.forkChild(set.resolve({ algorithm: "ES256" }), {
      startImmediately: true
    })

    const second = yield* Effect.forkChild(set.resolve({ algorithm: "ES256" }), {
      startImmediately: true
    })

    yield* Deferred.await(entered)
    assert.deepInclude(yield* set.resolve({ algorithm: "ES256" }).pipe(Effect.flip), {
      _tag: "JoseJwksUnavailable",
      reason: "busy"
    })
    yield* Fiber.interrupt(first)
    assert.strictEqual(interrupted, false)

    const replacement = yield* Effect.forkChild(set.resolve({ algorithm: "ES256" }), {
      startImmediately: true
    })

    yield* Deferred.succeed(release, undefined)
    assert.deepStrictEqual((yield* Fiber.join(second)).jwk, publicJwk)
    assert.deepStrictEqual((yield* Fiber.join(replacement)).jwk, publicJwk)
    assert.deepStrictEqual((yield* set.resolve({ algorithm: "ES256" })).jwk, publicJwk)
    assert.strictEqual(requests, 1)
    assert.strictEqual(interrupted, false)
  }).pipe(Effect.provide(cryptoLayer)))

// Retains the original shutdown race: onExit cannot release a waiter if the
// refresh fiber was interrupted before it began executing.
it.effect("releases lookup waiters when the Scope closes before refresh starts", () =>
  Effect.gen(function*() {
    let requests = 0

    const client = HttpClient.make(() =>
      Effect.sync(() => {
        requests++
      }).pipe(Effect.andThen(Effect.never))
    )

    const scope = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))

    const context = yield* Layer.buildWithScope(
      Jwks.layerRemote({ url: "https://issuer.example/keys" }).pipe(
        Layer.provide(Layer.succeed(HttpClient.HttpClient, client))
      ),
      scope
    )

    const set = Context.get(context, Jwks.Jwks)

    const lookup = yield* Effect.forkChild(set.resolve({ algorithm: "ES256" }).pipe(Effect.flip), {
      startImmediately: true
    })

    assert.strictEqual(requests, 0)
    yield* Scope.close(scope, Exit.void)
    assert.deepInclude(yield* Fiber.join(lookup), {
      _tag: "JoseJwksUnavailable",
      reason: "closed"
    })
    assert.strictEqual(requests, 0)
  }).pipe(
    Effect.provideService(Scheduler.PreventSchedulerYield, true),
    Effect.provide(cryptoLayer)
  ))

it.effect("enforces the response-byte limit across chunks, accepting the exact bound", () =>
  Effect.gen(function*() {
    const document = utf8(JSON.stringify({ keys: [publicJwk] }))

    for (const overflow of [false, true]) {
      const client = HttpClient.make((request) =>
        Effect.sync(() =>
          HttpClientResponse.fromWeb(
            request,
            new Response(
              new ReadableStream<Uint8Array>({
                start(controller) {
                  controller.enqueue(document.subarray(0, 30))
                  controller.enqueue(document.subarray(30))
                  if (overflow) controller.enqueue(utf8(" "))
                  controller.close()
                }
              })
            )
          )
        )
      )

      const context = yield* Layer.build(
        Jwks.layerRemote({
          url: "https://issuer.example/keys",
          maxResponseBytes: document.length
        }).pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, client)))
      )

      const result = yield* Context.get(context, Jwks.Jwks)
        .resolve({ algorithm: "ES256" })
        .pipe(
          Effect.map((key) => key.jwk),
          Effect.catchTag("JoseJwksUnavailable", (error) => Effect.succeed(error.reason))
        )

      assert.deepStrictEqual(result, overflow ? "response" : publicJwk)
    }
  }).pipe(Effect.provide(cryptoLayer)))
