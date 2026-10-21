import * as AuthAtom from "@effect/auth/Atom"
import * as AuthContract from "@effect/auth/AuthContract"
import * as Client from "@effect/auth/Client"
import { assert, it } from "@effect/vitest"
import { Context, Deferred, Effect, Fiber, Layer, Option, Scheduler, Schema, Tracer } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { AsyncResult, Atom, AtomRegistry } from "effect/reactivity"
import { TestClock } from "effect/testing"

// d1f2799 retires the SSR seed between confirming its subject and publishing the
// session result. Observe every notification; a browser can batch away this gap.
// Requested regression: one mounted session verifies once, with or without an SSR seed.
it.effect.each(["confirmation", "replacement", "unseeded"] as const)(
  "verifies a mounted session and preserves seed visibility through %s",
  (mode) =>
    Effect.gen(function*() {
      const contract = AuthContract.make("test/ssr-session", {
        claims: Schema.Struct({ name: Schema.String })
      })

      const seed = {
        sessionId: "session",
        subjectId: "member",
        securityRevision: "1",
        assurance: { method: "password", factors: ["knowledge"], authenticatedAt: 0 },
        issuedAt: 0,
        expiresAt: 3_600_000,
        absoluteExpiresAt: 3_600_000,
        claims: { name: "seed" }
      } satisfies typeof contract.sessions.Session.Encoded

      const entered = yield* Deferred.make<void>()
      const response = yield* Deferred.make<void>()
      let calls = 0
      let name = "confirmed"

      const http = HttpClient.make((request) =>
        Effect.gen(function*() {
          calls++
          yield* Deferred.succeed(entered, undefined)
          yield* Deferred.await(response)

          return HttpClientResponse.fromWeb(
            request,
            Response.json({
              _tag: "Success",
              value: { ...seed, claims: { name } }
            })
          )
        })
      )

      const AppClient = Client.make(contract, { baseUrl: "https://example.test" })

      const auth = AuthAtom.make(AppClient, {
        ...(mode === "unseeded" ? {} : { initialSession: seed }),
        layer: AppClient.layer.pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, http)))
      })

      const registry = yield* Effect.acquireRelease(
        Effect.sync(() => AtomRegistry.make()),
        (value) => Effect.sync(() => value.dispose())
      )

      const context = yield* AtomRegistry.getResult(registry, auth.runtime)
      const states: Array<string> = []

      yield* Effect.acquireRelease(
        Effect.sync(() => registry.subscribe(auth.session, (value) => states.push(value._tag))),
        (unsubscribe) => Effect.sync(unsubscribe)
      )
      assert.containSubset(
        registry.get(auth.session),
        mode === "unseeded"
          ? { _tag: "Initial" }
          : { _tag: "Success", value: { claims: { name: "seed" } }, waiting: true }
      )
      yield* Deferred.await(entered)
      if (mode === "replacement") {
        yield* Context.get(context, AuthAtom.AuthAtomLifetime).replaceSubject("member")
        assert.strictEqual(registry.get(auth.session)._tag, "Initial")
      }
      yield* Deferred.succeed(response, undefined)

      const session = yield* AtomRegistry.getResult(registry, auth.session, {
        suspendOnWaiting: true
      }).pipe(Effect.timeout("1 second"))

      assert.strictEqual(session?.claims.name, "confirmed")
      assert.strictEqual(calls, mode === "replacement" ? 2 : 1)
      if (mode !== "unseeded") assert.strictEqual(states.includes("Initial"), mode === "replacement")

      name = "refreshed"
      registry.refresh(auth.session)
      assert.strictEqual(
        (yield* AtomRegistry.getResult(registry, auth.session, {
          suspendOnWaiting: true
        }))?.claims.name,
        "refreshed"
      )
      assert.strictEqual(calls, mode === "replacement" ? 3 : 2)
    })
)

// d1f2799 also restarts custom queries that discover the account. Their own
// transition must retire account work; unrelated replacements clear their results.
it.effect("subject queries retire account work and discard unrelated account results", () =>
  Effect.gen(function*() {
    const contract = AuthContract.make("test/session-replacement", {
      claims: Schema.Struct({}),
      actions: (sessions) => ({
        discover: AuthContract.action({
          payload: Schema.Void,
          success: Schema.NullOr(sessions.Session),
          error: Schema.Never,
          mode: "query",
          subject: { fromSuccess: (value) => value?.subjectId ?? null }
        })
      })
    })

    const session = {
      sessionId: "session",
      subjectId: "member",
      securityRevision: "1",
      assurance: { method: "password", factors: ["knowledge"], authenticatedAt: 0 },
      issuedAt: 0,
      expiresAt: 3_600_000,
      absoluteExpiresAt: 3_600_000,
      claims: {}
    } satisfies typeof contract.sessions.Session.Encoded

    const entered = yield* Deferred.make<void>()
    const stale = yield* Deferred.make<void>()
    const replacement = yield* Deferred.make<void>()
    let phase: "initial" | "pending" | "replacement" | "signed-out" = "initial"
    let calls = 0

    const http = HttpClient.make((request) =>
      Effect.gen(function*() {
        calls++
        const started = phase

        if (started === "pending") {
          yield* Deferred.succeed(entered, undefined)
          yield* Deferred.await(stale)
        } else if (started === "replacement") yield* Deferred.await(replacement)

        return HttpClientResponse.fromWeb(
          request,
          Response.json({
            _tag: "Success",
            value: started === "signed-out"
              ? null
              : { ...session, subjectId: started === "replacement" ? "other" : "member" }
          })
        )
      })
    )

    const AppClient = Client.make(contract, { baseUrl: "https://example.test" })

    const auth = AuthAtom.make(AppClient, {
      layer: AppClient.layer.pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, http)))
    })

    const registry = yield* Effect.acquireRelease(
      Effect.sync(() => AtomRegistry.make()),
      (value) => Effect.sync(() => value.dispose())
    )

    const context = yield* AtomRegistry.getResult(registry, auth.runtime)
    const lifetime = Context.get(context, AuthAtom.AuthAtomLifetime)
    const finalized: Array<string | null> = []

    const account = auth.runtime.atom(
      Effect.gen(function*() {
        const { subject } = yield* lifetime.get

        yield* Effect.addFinalizer(() => Effect.sync(() => void finalized.push(subject)))

        return subject
      })
    )

    const workflowEntered = yield* Deferred.make<void>()

    const workflow = auth.runtime.fn<void>()(() =>
      Deferred.succeed(workflowEntered, undefined).pipe(Effect.andThen(Effect.never))
    )

    yield* AtomRegistry.mount(registry, account)
    assert.strictEqual(yield* AtomRegistry.getResult(registry, account), null)
    yield* AtomRegistry.mount(registry, workflow)
    registry.set(workflow, undefined)
    yield* Deferred.await(workflowEntered)
    yield* AtomRegistry.mount(registry, auth.discover)
    assert.strictEqual((yield* AtomRegistry.getResult(registry, auth.discover))?.subjectId, "member")
    assert.strictEqual(calls, 1)
    assert.deepStrictEqual(finalized, [null])
    assert.containSubset(registry.get(workflow), { _tag: "Failure", waiting: false })
    assert.strictEqual(yield* AtomRegistry.getResult(registry, account), "member")

    phase = "pending"
    registry.refresh(auth.discover)
    yield* Deferred.await(entered)
    phase = "replacement"
    yield* lifetime.replaceSubject("other")
    assert.containSubset(registry.get(auth.discover), { _tag: "Initial" })
    yield* Deferred.succeed(stale, undefined)
    assert.strictEqual(AsyncResult.value(registry.get(auth.discover))._tag, "None")
    yield* Deferred.succeed(replacement, undefined)
    assert.strictEqual(
      (yield* AtomRegistry.getResult(registry, auth.discover, { suspendOnWaiting: true }))
        ?.subjectId,
      "other"
    )
    assert.containSubset(yield* lifetime.get, { subject: "other", generation: 2 })
    assert.deepStrictEqual(finalized, [null, "member"])
    assert.strictEqual(calls, 3)

    phase = "signed-out"
    yield* lifetime.replaceSubject(null)
    assert.doesNotContainSubset(AsyncResult.value(registry.get(auth.discover)), {
      _tag: "Some",
      value: { subjectId: "other" }
    })
    assert.strictEqual(yield* AtomRegistry.getResult(registry, auth.discover, { suspendOnWaiting: true }), null)
    assert.strictEqual(calls, 4)
  }))

// https://github.com/yielded-dev/auth/commit/32be91d2
// Force the scheduler gap between the caller's fence and credential admission;
// a real browser cannot reliably pause at that boundary.
it.effect.each(["workflow", "client", "own-transition"] as const)(
  "keeps the initiating authentication generation across %s completion",
  (mode) =>
    Effect.gen(function*() {
      const contract = AuthContract.make("test/completion-generation", {
        claims: Schema.Struct({}),
        actions: () => ({
          authenticate: AuthContract.action({
            payload: Schema.String,
            success: Schema.String,
            error: Schema.String,
            mode: "mutation",
            credentials: true,
            subject: { fromSuccess: (value) => value }
          })
        })
      })

      let calls = 0

      const http = HttpClient.make((request) =>
        Effect.sync(() => {
          calls++

          return HttpClientResponse.fromWeb(
            request,
            Response.json(
              mode === "own-transition"
                ? { _tag: "Success", value: "signed-in" }
                : { _tag: "Failure", error: "denied" }
            )
          )
        })
      )

      const AppClient = Client.make(contract, { baseUrl: "https://example.test" })
      const factory = Atom.context()

      const auth = AuthAtom.make(AppClient, {
        runtime: factory,
        layer: AppClient.layer.pipe(Layer.provide(Layer.succeed(HttpClient.HttpClient, http)))
      })

      const registry = yield* Effect.acquireRelease(
        Effect.sync(() => AtomRegistry.make()),
        (value) => Effect.sync(() => value.dispose())
      )

      const context = yield* AtomRegistry.getResult(registry, auth.runtime)
      const lifetime = Context.get(context, AuthAtom.AuthAtomLifetime)

      const prepare = AuthAtom.workflow<string>()(
        auth.runtime,
        Effect.fnUntraced(function*(input) {
          const workflow = yield* AuthAtom.AuthAtomWorkflow

          return workflow.completeAuthentication(
            contract.actions.authenticate.route,
            input,
            (value) => value
          )
        }),
        { reactivityKeys: ["session"] }
      )

      const paused = yield* Deferred.make<void>()
      const dispatcher = new Scheduler.MixedScheduler().makeDispatcher()
      let intercepted = false
      let resume: (() => void) | undefined

      const scheduler: Scheduler.Scheduler = {
        executionMode: "async",
        shouldYield(fiber) {
          const span = Context.getOption(fiber.context, Tracer.ParentSpan)

          if (
            !intercepted &&
            Option.isSome(span) &&
            span.value._tag === "Span" &&
            span.value.name === "OperationHttpClient.completeAuthentication"
          ) {
            intercepted = true

            return true
          }

          return false
        },
        makeDispatcher: () => ({
          scheduleTask(task, priority) {
            if (resume === undefined) {
              resume = () => dispatcher.scheduleTask(task, priority)
              Deferred.doneUnsafe(paused, Effect.void)
            } else dispatcher.scheduleTask(task, priority)
          },
          flush: () => dispatcher.flush()
        })
      }

      const host = factory(Layer.empty).fn<string>()(
        Effect.fnUntraced(function*(input, get) {
          const complete = mode === "client"
            ? Context.get(context, AppClient).auth.authenticate(input)
            : yield* get.setResult(prepare, input)

          return yield* mode === "own-transition"
            ? complete
            : complete.pipe(Effect.provideService(Scheduler.Scheduler, scheduler))
        })
      )

      yield* AtomRegistry.mount(registry, host)
      registry.set(host, "proof")
      if (mode !== "own-transition") {
        yield* Deferred.await(paused)
        yield* lifetime.replaceSubject("replacement")
        resume?.()
      }

      const result = yield* AtomRegistry.getResult(registry, host, {
        suspendOnWaiting: true
      }).pipe(Effect.result, Effect.timeout("1 second"))

      assert.strictEqual(calls, mode === "own-transition" ? 1 : 0)
      assert.containSubset(yield* lifetime.get, {
        subject: mode === "own-transition" ? "signed-in" : "replacement",
        generation: 1
      })
      assert.containSubset(
        result,
        mode === "own-transition"
          ? { _tag: "Success", success: "signed-in" }
          : {
            _tag: "Failure",
            failure: { _tag: "OperationHttpError", reason: "stale-response" }
          }
      )
    })
)

// e2ca72c admitted credential requests without a deadline; a stalled response
// blocked account transitions and Scope cleanup even with an outer timeout.
it.effect("bounds credential admission without retrying and releases its request Scope", () =>
  Effect.gen(function*() {
    const entered = yield* Deferred.make<void>()
    const response = yield* Deferred.make<Response>()
    let calls = 0
    let aborted = false

    const AppClient = Client.make(
      AuthContract.make("test/admission-deadline", { claims: Schema.Struct({}) }),
      {
        baseUrl: "https://example.test"
      }
    )

    const httpClient = HttpClient.make((request, _url, signal) =>
      Effect.gen(function*() {
        calls++
        signal.addEventListener(
          "abort",
          () => {
            aborted = true
          },
          { once: true }
        )
        yield* Deferred.succeed(entered, undefined)

        return HttpClientResponse.fromWeb(request, yield* Deferred.await(response))
      })
    )

    const fiber = yield* AppClient.make.pipe(
      Effect.flatMap(({ auth }) => auth.signOut()),
      Effect.provideService(HttpClient.HttpClient, httpClient),
      Effect.result,
      // The request scope must close before the test checks that it was aborted.
      Effect.scoped,
      Effect.forkChild
    )

    yield* Deferred.await(entered)
    yield* TestClock.adjust("30 seconds")
    const observed = fiber.pollUnsafe()

    // Release the old implementation as well, so a red assertion cannot hang cleanup.
    yield* Deferred.succeed(response, Response.json({ _tag: "Success" }))
    yield* Fiber.await(fiber)
    assert.containSubset(observed, {
      _tag: "Success",
      value: { _tag: "Failure", failure: { _tag: "OperationHttpError", reason: "timeout" } }
    })
    assert.strictEqual(calls, 1)
    assert.strictEqual(aborted, true)
  }))

it.effect("latest named authentication settles after interrupted admission and failures discard previous values", () =>
  Effect.gen(function*() {
    const authContract = AuthContract.make("test/mutation-race", {
      claims: Schema.Struct({}),
      actions: () => ({
        authenticate: AuthContract.action({
          payload: Schema.String,
          success: Schema.String,
          error: Schema.String,
          mode: "mutation",
          credentials: true,
          subject: { fromSuccess: (value) => (value === "pending" ? undefined : value) }
        })
      })
    })

    const first = yield* Deferred.make<Response>()
    const second = yield* Deferred.make<Response>()
    const enteredFirst = yield* Deferred.make<void>()
    const enteredSecond = yield* Deferred.make<void>()
    let calls = 0

    const AppClient = Client.make(authContract, {
      baseUrl: "https://example.test"
    })

    const httpClient = HttpClient.make((request) =>
      Effect.gen(function*() {
        calls++
        if (calls === 1) {
          return HttpClientResponse.fromWeb(
            request,
            Response.json({ _tag: "Success", value: "old-member" })
          )
        }
        if (calls === 2) {
          return HttpClientResponse.fromWeb(
            request,
            Response.json({ _tag: "Failure", error: "denied" })
          )
        }
        const entered = calls === 3 ? enteredFirst : enteredSecond
        const response = calls === 3 ? first : second

        yield* Deferred.succeed(entered, undefined)

        return HttpClientResponse.fromWeb(request, yield* Deferred.await(response))
      })
    )

    const auth = AuthAtom.make(AppClient, {
      layer: AppClient.layer.pipe(
        Layer.provide(Layer.succeed(HttpClient.HttpClient, httpClient))
      )
    })

    const r = yield* Effect.acquireRelease(
      Effect.sync(() => AtomRegistry.make()),
      (registry) => Effect.sync(() => registry.dispose())
    )

    const result = <A, E>(
      registry: AtomRegistry.AtomRegistry,
      atom: Atom.Atom<AsyncResult.AsyncResult<A, E>>
    ) =>
      AtomRegistry.getResult(registry, atom, { suspendOnWaiting: true }).pipe(
        Effect.timeout("1 second")
      )

    yield* AtomRegistry.mount(r, auth.authenticate)
    r.set(auth.authenticate, "old")
    assert.strictEqual(yield* result(r, auth.authenticate), "old-member")
    r.set(auth.authenticate, "denied")
    assert.strictEqual(yield* Effect.flip(result(r, auth.authenticate)), "denied")
    assert.strictEqual(AsyncResult.value(r.get(auth.authenticate))._tag, "None")
    r.set(auth.authenticate, "first")
    yield* Deferred.await(enteredFirst)
    r.set(auth.authenticate, "second")
    yield* Deferred.succeed(first, Response.json({ _tag: "Success", value: "pending" }))
    yield* Deferred.await(enteredSecond)
    yield* Deferred.succeed(second, Response.json({ _tag: "Success", value: "new-member" }))
    assert.strictEqual(yield* result(r, auth.authenticate), "new-member")
  }))

it.effect("synchronous account replacement publishes a fresh query value", () =>
  Effect.gen(function*() {
    const contract = AuthContract.make("test/synchronous-replacement", {
      claims: Schema.Struct({})
    })

    const AppClient = Client.make(contract, { baseUrl: "https://example.test" })
    const auth = AuthAtom.make(AppClient)

    const registry = yield* Effect.acquireRelease(
      Effect.sync(() => AtomRegistry.make()),
      (value) => Effect.sync(() => value.dispose())
    )

    let reads = 0

    const query = auth.runtime.atom(
      Effect.gen(function*() {
        reads++
        if (reads === 1) {
          const lifetime = yield* AuthAtom.AuthAtomLifetime

          yield* lifetime.replaceSubject(null)

          return "retired"
        }

        return "current"
      })
    )

    assert.strictEqual(yield* AtomRegistry.getResult(registry, query).pipe(Effect.timeout("1 second")), "current")
    assert.strictEqual(reads, 2)
  }))
