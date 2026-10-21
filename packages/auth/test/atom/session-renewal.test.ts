import * as AuthAtom from "@effect/auth/Atom"
import * as AuthContract from "@effect/auth/AuthContract"
import * as Client from "@effect/auth/Client"
import { assert, it } from "@effect/vitest"
import { Clock, DateTime, Effect, Layer, Schema, SubscriptionRef } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { AtomRegistry } from "effect/reactivity"
import { TestClock } from "effect/testing"

// Explicitly requested seam: mounted session maintenance through the real named
// client, including foreground scheduling, failed rotation, and scope disposal.
const fixture = Effect.fnUntraced(function*(failRenewal = false) {
  const contract = AuthContract.make("test/automatic-renewal", { claims: Schema.Struct({}) })
  const activity = yield* SubscriptionRef.make(true)
  const clock = yield* Clock.Clock
  let issuedAt = 0
  let signedOut = false
  let renewals = 0
  let reads = 0

  const http = HttpClient.make((request) =>
    Effect.gen(function*() {
      const now = DateTime.toEpochMillis(yield* DateTime.now)

      if (request.url.endsWith("/renewSession")) {
        renewals++
        if (failRenewal) {
          return HttpClientResponse.fromWeb(request, Response.json({ _tag: "bad-response" }))
        }
        issuedAt = now
      } else if (request.url.endsWith("/signOut")) {
        signedOut = true

        return HttpClientResponse.fromWeb(
          request,
          Response.json({
            _tag: "Success",
            value: { clearCredential: true, invalidation: "revoked" }
          })
        )
      } else reads++

      return HttpClientResponse.fromWeb(
        request,
        Response.json({
          _tag: "Success",
          value: signedOut
            ? null
            : {
              sessionId: "session",
              subjectId: "member",
              securityRevision: "1",
              assurance: { method: "password", factors: ["knowledge"], authenticatedAt: 0 },
              issuedAt,
              expiresAt: Math.min(issuedAt + 70_000, 300_000),
              absoluteExpiresAt: 300_000,
              renewAfterMillis: Math.max(0, issuedAt + 10_000 - now),
              claims: {}
            }
        })
      )
    })
  )

  const AppClient = Client.make(contract, { baseUrl: "https://example.test" })

  const auth = AuthAtom.make(AppClient, {
    sessionRenewal: { activity: SubscriptionRef.changes(activity) },
    layer: AppClient.layer.pipe(
      Layer.provide(Layer.succeed(HttpClient.HttpClient, http)),
      Layer.provideMerge(Layer.succeed(Clock.Clock, clock))
    )
  })

  const registry = yield* Effect.acquireRelease(
    Effect.sync(() => AtomRegistry.make()),
    (value) => Effect.sync(() => value.dispose())
  )

  return { auth, registry, activity, renewals: () => renewals, reads: () => reads }
})

const flush = Effect.repeat(Effect.yieldNow, { times: 30 })

it.effect("renews once when due, pauses in background, and stops after sign-out", () =>
  Effect.gen(function*() {
    const f = yield* fixture()
    const unmount = f.registry.mount(f.auth.session)

    yield* AtomRegistry.getResult(f.registry, f.auth.session)
    yield* flush
    assert.strictEqual(f.reads(), 1)
    yield* TestClock.adjust("9 seconds")
    assert.strictEqual(f.renewals(), 0)
    yield* TestClock.adjust("1 second")
    yield* flush
    assert.strictEqual(f.renewals(), 1)

    const session = yield* AtomRegistry.getResult(f.registry, f.auth.session, {
      suspendOnWaiting: true
    })

    assert.strictEqual(DateTime.toEpochMillis(session!.assurance.authenticatedAt), 0)
    assert.strictEqual(DateTime.toEpochMillis(session!.absoluteExpiresAt), 300_000)
    yield* SubscriptionRef.set(f.activity, false)
    yield* flush
    yield* TestClock.adjust("20 seconds")
    assert.strictEqual(f.renewals(), 1)
    yield* SubscriptionRef.set(f.activity, true)
    yield* flush
    assert.strictEqual(f.renewals(), 2)
    f.registry.set(f.auth.signOut, undefined)
    yield* AtomRegistry.getResult(f.registry, f.auth.signOut, { suspendOnWaiting: true })
    yield* TestClock.adjust("20 seconds")
    yield* flush
    assert.strictEqual(f.renewals(), 2)
    unmount()
  }))

it.effect("keeps a failed rotation observable and never retries it on resume or remount", () =>
  Effect.gen(function*() {
    const f = yield* fixture(true)
    const unmount = f.registry.mount(f.auth.session)

    yield* AtomRegistry.getResult(f.registry, f.auth.session)
    yield* flush
    yield* TestClock.adjust("10 seconds")
    yield* flush
    assert.strictEqual(f.renewals(), 1)
    assert.strictEqual(f.registry.get(f.auth.sessionRenewal)._tag, "Failure")
    unmount()
    yield* SubscriptionRef.set(f.activity, false)
    yield* TestClock.adjust("20 seconds")
    const remount = f.registry.mount(f.auth.session)

    yield* SubscriptionRef.set(f.activity, true)
    yield* flush
    assert.strictEqual(f.renewals(), 1)
    f.registry.dispose()
    yield* TestClock.adjust("20 seconds")
    assert.strictEqual(f.renewals(), 1)
    remount()
  }))

// Requested lifecycle seam: retaining the read query across a maintenance remount
// must not restart the server's renewal delay from the old cached result.
it.effect("preserves the renewal deadline when remounting a retained session", () =>
  Effect.gen(function*() {
    const f = yield* fixture()
    const keepRead = f.registry.mount(f.auth.getSession())
    const unmount = f.registry.mount(f.auth.session)

    yield* AtomRegistry.getResult(f.registry, f.auth.session)
    yield* flush
    unmount()
    yield* flush
    yield* TestClock.adjust("11 seconds")
    const remount = f.registry.mount(f.auth.session)

    yield* flush
    assert.strictEqual(f.renewals(), 1)
    remount()
    keepRead()
  }))
