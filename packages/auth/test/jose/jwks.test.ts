import { Jwks, Jws } from "@effect/auth"
import { assert, it } from "@effect/vitest"
import { Context, Deferred, Effect, Exit, Fiber, Layer, Redacted, Scope } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { TestClock } from "effect/testing"
import * as jose from "jose"
import { cryptoLayer, privateJwk, publicJwk, utf8 } from "./fixtures.ts"

// Selection, refresh/cooldown and malformed-key contracts adapted from panva/jose
// test/jwks/{local,remote}.test.ts; Effect Scope and TestClock replace global mocks.
it.effect("selects local public keys by algorithm, kid, use and key_ops without HTTP", () =>
  Effect.gen(function*() {
    const signing = yield* Effect.promise(() => jose.importJWK(privateJwk, "ES256"))

    const token = yield* Effect.promise(() =>
      new jose.CompactSign(utf8("payload"))
        .setProtectedHeader({ alg: "ES256", kid: "one", jku: "https://untrusted.example/keys" })
        .sign(signing)
    )

    const keys = [
      { ...publicJwk, kid: "one", use: "enc" },
      { ...publicJwk, kid: "one", key_ops: ["sign"] },
      { ...publicJwk, kid: "one", alg: "ES256", use: "sig", key_ops: ["verify"] },
      { ...publicJwk, kid: "two" }
    ]

    const verified = yield* Jws.verifyWithKeySet(Redacted.make(token), {
      algorithms: ["ES256"]
    }).pipe(Effect.provide(Jwks.layerLocal({ keys })))

    assert.deepStrictEqual(Redacted.value(verified.payload), utf8("payload"))
    const set = yield* Jwks.Jwks.pipe(Effect.provide(Jwks.layerLocal({ keys })))

    assert.strictEqual((yield* set.resolve({ algorithm: "ES256" }).pipe(Effect.flip))._tag, "JoseAmbiguousKey")
    assert.strictEqual(
      (yield* set.resolve({ algorithm: "ES256", kid: "missing" }).pipe(Effect.flip))._tag,
      "JoseKeyNotFound"
    )
    assert.strictEqual(
      (yield* Jwks.Jwks.pipe(Effect.provide(Jwks.layerLocal({ keys: [privateJwk] })), Effect.flip))
        ._tag,
      "JoseInvalidKey"
    )
  }).pipe(Effect.provide(cryptoLayer)))

it.effect(
  "coalesces refresh, cools down unknown kids, rotates keys and isolates Layer caches",
  () =>
    Effect.gen(function*() {
      let requests = 0
      let document: unknown = { keys: [{ ...publicJwk, kid: "one" }] }
      const entered = yield* Deferred.make<void>()
      const release = yield* Deferred.make<void>()

      const client = HttpClient.make((request) =>
        Effect.gen(function*() {
          requests++
          yield* Deferred.succeed(entered, undefined)
          yield* Deferred.await(release)

          return HttpClientResponse.fromWeb(request, new Response(JSON.stringify(document)))
        })
      )

      const layer = Jwks.layerRemote({
        url: "https://issuer.example/keys",
        cacheTimeMs: 100,
        cooldownMs: 10
      }).pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, client)))

      const context = yield* Layer.build(layer)
      const set = Context.get(context, Jwks.Jwks)

      const concurrent = yield* Effect.forkChild(
        Effect.all(
          Array.from({ length: 12 }, () => set.resolve({ algorithm: "ES256", kid: "one" })),
          { concurrency: 12 }
        )
      )

      yield* Deferred.await(entered)
      yield* Deferred.succeed(release, undefined)
      assert.lengthOf(yield* Fiber.join(concurrent), 12)
      assert.strictEqual(requests, 1)
      for (let index = 0; index < 3; index++) {
        assert.strictEqual(
          (yield* set.resolve({ algorithm: "ES256", kid: "two" }).pipe(Effect.flip))._tag,
          "JoseKeyNotFound"
        )
      }
      assert.strictEqual(requests, 1)
      document = { keys: [{ ...publicJwk, kid: "two" }] }
      yield* TestClock.adjust(11)
      assert.strictEqual((yield* set.resolve({ algorithm: "ES256", kid: "two" })).jwk.kid, "two")
      assert.strictEqual(requests, 2)

      const otherContext = yield* Layer.build(
        Jwks.layerRemote({ url: "https://another.example/keys" }).pipe(
          Layer.provide(Layer.succeed(HttpClient.HttpClient, client))
        )
      )

      const other = Context.get(otherContext, Jwks.Jwks)

      assert.strictEqual((yield* other.resolve({ algorithm: "ES256", kid: "two" })).jwk.kid, "two")
      assert.strictEqual(requests, 3)
      document = { keys: [privateJwk] }
      yield* TestClock.adjust(101)
      assert.strictEqual(
        (yield* set.resolve({ algorithm: "ES256", kid: "two" }).pipe(Effect.flip))._tag,
        "JoseJwksUnavailable"
      )
      assert.strictEqual(
        (yield* set.resolve({ algorithm: "ES256", kid: "two" }).pipe(Effect.flip))._tag,
        "JoseJwksUnavailable"
      )
      assert.strictEqual(requests, 4)
      assert.strictEqual((yield* other.resolve({ algorithm: "ES256", kid: "two" })).jwk.kid, "two")
    }).pipe(Effect.provide(cryptoLayer))
)

it.effect("bounds remote bodies and keys and refuses untrusted or redirected URLs", () =>
  Effect.gen(function*() {
    const client = HttpClient.make((request) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(
          request,
          new Response(JSON.stringify({ keys: [publicJwk, publicJwk] }))
        )
      )
    )

    for (const options of [{ maxResponseBytes: 40 }, { maxKeys: 1 }]) {
      const result = yield* Effect.gen(function*() {
        const context = yield* Layer.build(
          Jwks.layerRemote({ url: "https://issuer.example/keys", ...options }).pipe(
            Layer.provide(Layer.succeed(HttpClient.HttpClient, client))
          )
        )

        return yield* Context.get(context, Jwks.Jwks).resolve({ algorithm: "ES256" })
      }).pipe(Effect.flip)

      assert.strictEqual(result._tag, "JoseJwksUnavailable")
    }
    for (
      const url of [
        "http://issuer.example/keys",
        "https://user:password@issuer.example/keys",
        "https://issuer.example/keys#fragment"
      ]
    ) {
      assert.strictEqual(
        (yield* Layer.build(
          Jwks.layerRemote({ url }).pipe(
            Layer.provide(Layer.succeed(HttpClient.HttpClient, client))
          )
        ).pipe(Effect.flip))._tag,
        "JoseJwksUnavailable"
      )
    }

    const redirected = HttpClient.make((request) =>
      Effect.succeed(
        HttpClientResponse.fromWeb(
          { ...request, url: "https://different.example/keys" },
          new Response(JSON.stringify({ keys: [publicJwk] }))
        )
      )
    )

    const context = yield* Layer.build(
      Jwks.layerRemote({ url: "https://issuer.example/keys" }).pipe(
        Layer.provide(Layer.succeed(HttpClient.HttpClient, redirected))
      )
    )

    assert.strictEqual(
      (yield* Context.get(context, Jwks.Jwks).resolve({ algorithm: "ES256" }).pipe(Effect.flip))
        ._tag,
      "JoseJwksUnavailable"
    )
  }).pipe(Effect.provide(cryptoLayer)))

it.effect("times out refreshes and interrupts in-flight requests when the Layer Scope closes", () =>
  Effect.gen(function*() {
    let interrupted = 0
    let started = yield* Deferred.make<void>()

    const client = HttpClient.make(() =>
      Deferred.succeed(started, undefined).pipe(
        Effect.andThen(Effect.never),
        Effect.onInterrupt(() =>
          Effect.sync(() => {
            interrupted++
          })
        )
      )
    )

    const scoped = yield* Effect.acquireRelease(Scope.make(), (scope) => Scope.close(scope, Exit.void))

    const context = yield* Layer.buildWithScope(
      Jwks.layerRemote({ url: "https://issuer.example/keys", timeoutMs: 10, cooldownMs: 1 }).pipe(
        Layer.provide(Layer.succeed(HttpClient.HttpClient, client))
      ),
      scoped
    )

    const set = Context.get(context, Jwks.Jwks)
    const first = yield* Effect.forkChild(set.resolve({ algorithm: "ES256" }).pipe(Effect.flip))

    yield* Deferred.await(started)
    yield* TestClock.adjust(10)
    assert.strictEqual((yield* Fiber.join(first))._tag, "JoseJwksUnavailable")
    assert.strictEqual(interrupted, 1)
    yield* TestClock.adjust(2)
    started = yield* Deferred.make<void>()
    const second = yield* Effect.forkChild(set.resolve({ algorithm: "ES256" }))

    yield* Deferred.await(started)
    yield* Scope.close(scoped, Exit.void)
    assert.strictEqual(Exit.isFailure(yield* Fiber.await(second)), true)
    assert.strictEqual(interrupted, 2)
    assert.deepInclude(yield* set.resolve({ algorithm: "ES256" }).pipe(Effect.flip), {
      _tag: "JoseJwksUnavailable",
      reason: "closed"
    })
  }).pipe(Effect.provide(cryptoLayer)))
