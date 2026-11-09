import { assert, describe, it } from "@effect/vitest"
import {
  Clock,
  Deferred,
  Duration,
  Effect,
  Exit,
  Fiber,
  FileSystem,
  Logger,
  Option,
  PlatformError,
  Redacted,
  Result,
  Schedule,
  Scope
} from "effect"
import { type AiError, type Credentials, WorkloadIdentity } from "effect/ai"
import {
  FetchHttpClient,
  Headers,
  HttpClient,
  HttpClientError,
  HttpClientRequest,
  HttpClientResponse
} from "effect/http"
import * as TestClock from "effect/testing/TestClock"

const accessToken = (id: string, issuedAt = 0, lifetimeMs = 3_600_000): WorkloadIdentity.AccessToken => ({
  token: Redacted.make(id),
  issuedAt,
  expiresAt: issuedAt + lifetimeMs
})

const fileSystemWith = (read: (path: string) => Effect.Effect<string, PlatformError.PlatformError>) =>
  FileSystem.layerNoop({ readFileString: (path) => read(path) })

describe("WorkloadIdentity", () => {
  describe("fromFile", () => {
    it.effect("rereads and trims the file on every run", () =>
      Effect.gen(function*() {
        const contents = ["  jwt-1\n", "jwt-2\n"]
        const source = WorkloadIdentity.fromFile("/token")
        const program = Effect.provide(
          Effect.all([source, source]),
          fileSystemWith(() => Effect.sync(() => contents.shift()!))
        )
        const [first, second] = yield* program
        assert.strictEqual(Redacted.value(first.token), "jwt-1")
        assert.strictEqual(Redacted.value(second.token), "jwt-2")
      }))

    it.effect("defaults the type to jwt and honors an explicit id_token", () =>
      Effect.gen(function*() {
        const layer = fileSystemWith(() => Effect.succeed("token"))
        const [byDefault, explicit] = yield* Effect.all([
          WorkloadIdentity.fromFile("/token"),
          WorkloadIdentity.fromFile("/token", { type: "id_token" })
        ]).pipe(Effect.provide(layer))
        assert.strictEqual(byDefault.type, "jwt")
        assert.strictEqual(explicit.type, "id_token")
      }))

    it.effect("rejects an empty file", () =>
      Effect.gen(function*() {
        const error = yield* WorkloadIdentity.fromFile("/token").pipe(
          Effect.provide(fileSystemWith(() => Effect.succeed(" \n"))),
          Effect.flip
        )
        assert.strictEqual(error._tag, "IdentityTokenError")
        assert.include(error.message, "empty")
      }))

    it.effect("wraps a read failure", () =>
      Effect.gen(function*() {
        const error = yield* WorkloadIdentity.fromFile("/missing").pipe(
          Effect.provide(fileSystemWith((path) =>
            Effect.fail(PlatformError.systemError({
              _tag: "NotFound",
              module: "FileSystem",
              method: "readFileString",
              pathOrDescriptor: path
            }))
          )),
          Effect.flip
        )
        assert.strictEqual(error._tag, "IdentityTokenError")
        assert.include(error.message, "/missing")
        assert.strictEqual((error.cause as PlatformError.PlatformError)._tag, "PlatformError")
      }))
  })

  describe("fromRedacted", () => {
    it.effect("defaults the type to jwt and honors an explicit id_token", () =>
      Effect.gen(function*() {
        const token = Redacted.make("token")
        const byDefault = yield* WorkloadIdentity.fromRedacted(token)
        const explicit = yield* WorkloadIdentity.fromRedacted(token, { type: "id_token" })
        assert.strictEqual(byDefault.token, token)
        assert.strictEqual(byDefault.type, "jwt")
        assert.strictEqual(explicit.token, token)
        assert.strictEqual(explicit.type, "id_token")
      }))
  })

  describe("exchangeWithRetry", () => {
    const counting = () => {
      let issued = 0
      const seen: Array<string> = []
      const source: WorkloadIdentity.IdentityTokenSource = Effect.sync(() => ({
        token: Redacted.make(`jwt-${++issued}`),
        type: "jwt" as const
      }))
      return { source, seen }
    }

    it.effect("makes exactly one attempt with Schedule.recurs(0)", () =>
      Effect.gen(function*() {
        const { seen, source } = counting()
        const error = yield* WorkloadIdentity.exchangeWithRetry({
          identityToken: source,
          exchange: (jwt) => {
            seen.push(Redacted.value(jwt.token))
            return Effect.fail(new WorkloadIdentity.ExchangeError({ kind: "Transient", status: 503 }))
          },
          schedule: Schedule.recurs(0)
        }).pipe(Effect.flip)
        assert.strictEqual(error._tag, "ExchangeError")
        assert.deepStrictEqual(seen, ["jwt-1"])
      }))

    it.effect("retries Transient failures with a fresh identity token per attempt", () =>
      Effect.gen(function*() {
        const { seen, source } = counting()
        const token = yield* WorkloadIdentity.exchangeWithRetry({
          identityToken: source,
          exchange: (jwt) => {
            seen.push(Redacted.value(jwt.token))
            return seen.length < 3
              ? Effect.fail(new WorkloadIdentity.ExchangeError({ kind: "Transient", status: 503 }))
              : Effect.succeed(accessToken("access"))
          },
          schedule: Schedule.recurs(2)
        })
        assert.strictEqual(Redacted.value(token.token), "access")
        assert.deepStrictEqual(seen, ["jwt-1", "jwt-2", "jwt-3"])
      }))

    it.effect("never retries Rejected failures", () =>
      Effect.gen(function*() {
        const { seen, source } = counting()
        const error = yield* WorkloadIdentity.exchangeWithRetry({
          identityToken: source,
          exchange: (jwt) => {
            seen.push(Redacted.value(jwt.token))
            return Effect.fail(new WorkloadIdentity.ExchangeError({ kind: "Rejected", status: 401 }))
          },
          schedule: Schedule.recurs(5)
        }).pipe(Effect.flip)
        assert.strictEqual((error as WorkloadIdentity.ExchangeError).kind, "Rejected")
        assert.deepStrictEqual(seen, ["jwt-1"])
      }))

    it.effect("waits at least retryAfter before retrying", () =>
      Effect.gen(function*() {
        const { seen, source } = counting()
        const fiber = yield* WorkloadIdentity.exchangeWithRetry({
          identityToken: source,
          exchange: (jwt) => {
            seen.push(Redacted.value(jwt.token))
            return seen.length === 1
              ? Effect.fail(
                new WorkloadIdentity.ExchangeError({
                  kind: "Transient",
                  status: 429,
                  retryAfter: Duration.seconds(5)
                })
              )
              : Effect.succeed(accessToken("access"))
          },
          schedule: Schedule.recurs(1)
        }).pipe(Effect.forkChild)
        yield* TestClock.adjust(Duration.seconds(4))
        assert.deepStrictEqual(seen, ["jwt-1"])
        yield* TestClock.adjust(Duration.seconds(1))
        const exit = yield* Fiber.await(fiber)
        assert.isTrue(Exit.isSuccess(exit))
        assert.deepStrictEqual(seen, ["jwt-1", "jwt-2"])
      }))

    it.effect.each([
      { retryAfter: 60, waits: 10 },
      { retryAfter: 5, waits: 5 }
    ])(
      "waits min(retryAfter, maxRetryAfter) for a retryAfter of $retryAfter seconds",
      ({ retryAfter, waits }) =>
        Effect.gen(function*() {
          const { seen, source } = counting()
          const fiber = yield* WorkloadIdentity.exchangeWithRetry({
            identityToken: source,
            exchange: (jwt) => {
              seen.push(Redacted.value(jwt.token))
              return seen.length === 1
                ? Effect.fail(
                  new WorkloadIdentity.ExchangeError({
                    kind: "Transient",
                    status: 429,
                    retryAfter: Duration.seconds(retryAfter)
                  })
                )
                : Effect.succeed(accessToken("access"))
            },
            schedule: Schedule.recurs(1),
            maxRetryAfter: "10 seconds"
          }).pipe(Effect.forkChild)
          yield* TestClock.adjust(Duration.millis(waits * 1000 - 1))
          assert.deepStrictEqual(seen, ["jwt-1"])
          yield* TestClock.adjust(Duration.millis(1))
          const exit = yield* Fiber.await(fiber)
          assert.isTrue(Exit.isSuccess(exit))
          assert.deepStrictEqual(seen, ["jwt-1", "jwt-2"])
        })
    )

    it.effect("leaves a schedule delay above maxRetryAfter alone", () =>
      Effect.gen(function*() {
        const { seen, source } = counting()
        const fiber = yield* WorkloadIdentity.exchangeWithRetry({
          identityToken: source,
          exchange: (jwt) => {
            seen.push(Redacted.value(jwt.token))
            return seen.length === 1
              ? Effect.fail(
                new WorkloadIdentity.ExchangeError({ kind: "Transient", status: 429, retryAfter: Duration.seconds(5) })
              )
              : Effect.succeed(accessToken("access"))
          },
          schedule: Schedule.max([Schedule.spaced("30 seconds"), Schedule.recurs(1)]),
          maxRetryAfter: "10 seconds"
        }).pipe(Effect.forkChild)
        yield* TestClock.adjust(Duration.seconds(29))
        assert.deepStrictEqual(seen, ["jwt-1"])
        yield* TestClock.adjust(Duration.seconds(1))
        const exit = yield* Fiber.await(fiber)
        assert.isTrue(Exit.isSuccess(exit))
        assert.deepStrictEqual(seen, ["jwt-1", "jwt-2"])
      }))
  })

  it("formats ExchangeError messages from parsed fields", () => {
    const error = new WorkloadIdentity.ExchangeError({
      kind: "Rejected",
      status: 401,
      requestId: "req_1",
      description: "authentication_error: Authentication failed",
      hint: "Check the rule."
    })
    assert.strictEqual(
      error.message,
      "Token exchange failed (Rejected) with status 401 (request-id req_1): authentication_error: Authentication failed. Check the rule."
    )
    const punctuated = new WorkloadIdentity.ExchangeError({
      kind: "Rejected",
      description: "Authentication failed!",
      hint: "Check the rule."
    })
    assert.strictEqual(punctuated.message, "Token exchange failed (Rejected): Authentication failed! Check the rule.")
  })

  describe("TokenCache", () => {
    const HOUR = 3_600_000

    // The three providers' published refresh numbers, so the cache is exercised
    // with each shape it has to support.
    const anthropicPolicy: WorkloadIdentity.RefreshPolicy = {
      advisory: (lifetime) => Duration.min(Duration.seconds(120), Duration.millis(Duration.toMillis(lifetime) / 2)),
      mandatory: (lifetime) => Duration.min(Duration.seconds(30), Duration.millis(Duration.toMillis(lifetime) / 4)),
      advisoryFailureBackoff: Duration.seconds(5)
    }
    const openAiPolicy: WorkloadIdentity.RefreshPolicy = {
      advisory: (lifetime) => Duration.min(Duration.seconds(1200), Duration.millis(Duration.toMillis(lifetime) / 2)),
      mandatory: () => Duration.zero,
      advisoryFailureBackoff: Duration.zero
    }
    const openRouterPolicy: WorkloadIdentity.RefreshPolicy = {
      advisory: (lifetime) => Duration.min(Duration.seconds(60), Duration.millis(Duration.toMillis(lifetime) / 3)),
      mandatory: () => Duration.seconds(15),
      advisoryFailureBackoff: Duration.zero
    }

    const settle = Effect.yieldNow.pipe(Effect.repeat({ times: 10 }))

    type Script = Array<"ok" | "fail">

    const makeExchange = (lifetimeMs: number, script: Script = []) => {
      let calls = 0
      const exchange = Effect.gen(function*() {
        calls++
        if (script.shift() === "fail") {
          return yield* new WorkloadIdentity.ExchangeError({ kind: "Transient", status: 503 })
        }
        const now = yield* Clock.currentTimeMillis
        return accessToken(`t${calls}`, now, lifetimeMs)
      })
      return { exchange, calls: () => calls }
    }

    const value = (token: WorkloadIdentity.AccessToken) => Redacted.value(token.token)

    it.effect.each([
      { name: "anthropic", policy: anthropicPolicy, advisoryAt: HOUR - 120_000, mandatoryAt: HOUR - 30_000 },
      { name: "openai", policy: openAiPolicy, advisoryAt: HOUR - 1_200_000, mandatoryAt: HOUR },
      { name: "openrouter", policy: openRouterPolicy, advisoryAt: HOUR - 60_000, mandatoryAt: HOUR - 15_000 }
    ])("$name policy windows", ({ advisoryAt, mandatoryAt, policy }) =>
      Effect.gen(function*() {
        const { calls, exchange } = makeExchange(HOUR)
        const cache = yield* WorkloadIdentity.makeTokenCache({ exchange, policy })

        assert.strictEqual(value(yield* cache.get), "t1")
        assert.strictEqual(calls(), 1)

        yield* TestClock.setTime(advisoryAt - 1)
        assert.strictEqual(value(yield* cache.get), "t1")
        yield* settle
        assert.strictEqual(calls(), 1)

        yield* TestClock.setTime(advisoryAt)
        assert.strictEqual(value(yield* cache.get), "t1")
        yield* settle
        assert.strictEqual(calls(), 2)
        assert.strictEqual(value(yield* cache.get), "t2")

        // t2 was issued at advisoryAt, so its mandatory point is one hour later.
        yield* TestClock.setTime(advisoryAt + mandatoryAt)
        assert.strictEqual(value(yield* cache.get), "t3")
        assert.strictEqual(calls(), 3)
      }).pipe(Effect.scoped))

    // Issues t1 at the current time and holds every later exchange until
    // released, so a background refresh cannot replace t1 while the mandatory
    // edge `mandatoryAfter` milliseconds after issue is probed.
    const assertMandatoryEdge = Effect.fnUntraced(
      function*(lifetimeMs: number, policy: WorkloadIdentity.RefreshPolicy, mandatoryAfter: number) {
        const gate = yield* Deferred.make<void>()
        let calls = 0
        const exchange = Effect.gen(function*() {
          const call = ++calls
          if (call > 1) yield* Deferred.await(gate)
          return accessToken(`t${call}`, yield* Clock.currentTimeMillis, lifetimeMs)
        })
        const issuedAt = yield* Clock.currentTimeMillis
        const cache = yield* WorkloadIdentity.makeTokenCache({ exchange, policy })
        yield* cache.get
        yield* TestClock.setTime(issuedAt + mandatoryAfter - 1)
        assert.strictEqual(value(yield* cache.get), "t1")
        yield* TestClock.setTime(issuedAt + mandatoryAfter)
        const waiter = yield* Effect.forkChild(cache.get)
        yield* settle
        assert.isUndefined(waiter.pollUnsafe())
        yield* Deferred.succeed(gate, undefined)
        assert.strictEqual(value(yield* Fiber.join(waiter)), "t2")
      },
      Effect.scoped
    )

    it.effect("anthropic policy serves the cached token until the mandatory point", () =>
      assertMandatoryEdge(HOUR, anthropicPolicy, HOUR - 30_000))

    it.effect("clamps margins for a 60 second token", () =>
      Effect.gen(function*() {
        const { calls, exchange } = makeExchange(60_000)
        const cache = yield* WorkloadIdentity.makeTokenCache({ exchange, policy: anthropicPolicy })
        yield* cache.get
        yield* TestClock.setTime(29_999)
        yield* cache.get
        yield* settle
        assert.strictEqual(calls(), 1)
        yield* TestClock.setTime(30_000)
        assert.strictEqual(value(yield* cache.get), "t1")
        yield* settle
        assert.strictEqual(calls(), 2)

        yield* assertMandatoryEdge(60_000, anthropicPolicy, 45_000)
      }).pipe(Effect.scoped))

    it.effect("runs one exchange for many concurrent callers", () =>
      Effect.gen(function*() {
        const gate = yield* Deferred.make<void>()
        let calls = 0
        const exchange = Effect.gen(function*() {
          calls++
          yield* Deferred.await(gate)
          return accessToken("shared")
        })
        const cache = yield* WorkloadIdentity.makeTokenCache({ exchange, policy: anthropicPolicy })
        const fibers = yield* Effect.forEach(Array.from({ length: 50 }), () => Effect.forkChild(cache.get))
        yield* settle
        yield* Deferred.succeed(gate, undefined)
        const tokens = yield* Effect.forEach(fibers, Fiber.join)
        assert.strictEqual(calls, 1)
        assert.isTrue(tokens.every((token) => value(token) === "shared"))
      }).pipe(Effect.scoped))

    it.effect("serves the cached token when a background refresh fails, then backs off", () =>
      Effect.gen(function*() {
        const { calls, exchange } = makeExchange(HOUR, ["ok", "fail", "ok"])
        const cache = yield* WorkloadIdentity.makeTokenCache({ exchange, policy: anthropicPolicy })
        yield* cache.get

        yield* TestClock.setTime(HOUR - 120_000)
        assert.strictEqual(value(yield* cache.get), "t1")
        yield* settle
        assert.strictEqual(calls(), 2)

        yield* TestClock.setTime(HOUR - 120_000 + 4_999)
        assert.strictEqual(value(yield* cache.get), "t1")
        yield* settle
        assert.strictEqual(calls(), 2)

        yield* TestClock.setTime(HOUR - 120_000 + 5_000)
        yield* cache.get
        yield* settle
        assert.strictEqual(calls(), 3)
        assert.strictEqual(value(yield* cache.get), "t3")
      }).pipe(Effect.scoped))

    it.effect("a successful refresh clears the advisory backoff", () =>
      Effect.gen(function*() {
        let calls = 0
        const script = ["ok", "fail", "ok", "ok"]
        const exchange = Effect.gen(function*() {
          const call = ++calls
          if (script.shift() === "fail") {
            return yield* new WorkloadIdentity.ExchangeError({ kind: "Transient", status: 503 })
          }
          return accessToken(`t${call}`, yield* Clock.currentTimeMillis, call === 3 ? 200_000 : HOUR)
        })
        const cache = yield* WorkloadIdentity.makeTokenCache({
          exchange,
          policy: { ...anthropicPolicy, advisoryFailureBackoff: Duration.seconds(500) }
        })
        yield* cache.get

        const failedAt = HOUR - 120_000
        yield* TestClock.setTime(failedAt)
        yield* cache.get
        yield* settle
        assert.strictEqual(calls, 2)

        yield* TestClock.setTime(HOUR - 30_000)
        assert.strictEqual(value(yield* cache.get), "t3")

        // t3 lives 200 seconds, so its advisory window opens 100 seconds after
        // issue, still inside the 500 second backoff that started at `failedAt`.
        yield* TestClock.setTime(HOUR - 30_000 + 100_000)
        assert.strictEqual(value(yield* cache.get), "t3")
        yield* settle
        assert.strictEqual(calls, 4)
        assert.strictEqual(value(yield* cache.get), "t4")
      }).pipe(Effect.scoped))

    it.effect("fails the caller when a mandatory refresh fails", () =>
      Effect.gen(function*() {
        const { exchange } = makeExchange(HOUR, ["ok", "fail"])
        const cache = yield* WorkloadIdentity.makeTokenCache({ exchange, policy: anthropicPolicy })
        yield* cache.get
        yield* TestClock.setTime(HOUR - 30_000)
        const error = yield* Effect.flip(cache.get)
        assert.strictEqual(error._tag, "ExchangeError")
      }).pipe(Effect.scoped))

    it.effect.each(["ok", "fail"] as const)(
      "mandatory callers join an advisory refresh in flight (%s)",
      (outcome) =>
        Effect.gen(function*() {
          const gate = yield* Deferred.make<void>()
          let calls = 0
          const exchange = Effect.gen(function*() {
            const call = ++calls
            if (call === 2) {
              yield* Deferred.await(gate)
              if (outcome === "fail") {
                return yield* new WorkloadIdentity.ExchangeError({ kind: "Transient", status: 503 })
              }
            }
            return accessToken(`t${call}`, yield* Clock.currentTimeMillis)
          })
          const cache = yield* WorkloadIdentity.makeTokenCache({ exchange, policy: anthropicPolicy })
          yield* cache.get
          yield* TestClock.setTime(HOUR - 120_000)
          yield* cache.get // starts background refresh #2, held by the gate
          yield* settle
          yield* TestClock.setTime(HOUR - 30_000)
          const waiters = yield* Effect.forEach([1, 2, 3], () => Effect.forkChild(Effect.exit(cache.get)))
          yield* settle
          yield* Deferred.succeed(gate, undefined)
          const exits = yield* Effect.forEach(waiters, Fiber.join)
          assert.strictEqual(calls, 2)
          for (const exit of exits) {
            if (outcome === "ok") {
              assert.isTrue(Exit.isSuccess(exit) && value(exit.value) === "t2")
            } else {
              const error = Exit.findErrorOption(exit)
              assert.isTrue(
                Option.isSome(error) && error.value._tag === "ExchangeError" && error.value.kind === "Transient" &&
                  error.value.status === 503
              )
            }
          }
        }).pipe(Effect.scoped)
    )

    describe("advisory failure warnings", () => {
      const capture = () => {
        const warnings: Array<unknown> = []
        const logger = Logger.make((event) => {
          if (event.logLevel === "Warn") warnings.push(event.message)
        })
        return { warnings, layer: Logger.layer([logger]) }
      }

      it.effect("logs one warning for a failed current-generation refresh", () => {
        const { layer, warnings } = capture()
        return Effect.gen(function*() {
          const { calls, exchange } = makeExchange(HOUR, ["ok", "fail"])
          const cache = yield* WorkloadIdentity.makeTokenCache({ exchange, policy: anthropicPolicy })
          yield* cache.get
          yield* TestClock.setTime(HOUR - 120_000)
          yield* cache.get
          yield* settle
          assert.strictEqual(calls(), 2)
          assert.strictEqual(warnings.length, 1)
        }).pipe(Effect.scoped, Effect.provide(layer))
      })

      it.effect("logs nothing for a failed refresh superseded by invalidateWhen", () => {
        const { layer, warnings } = capture()
        return Effect.gen(function*() {
          const gate = yield* Deferred.make<void>()
          let calls = 0
          const exchange = Effect.gen(function*() {
            const call = ++calls
            if (call === 2) {
              yield* Deferred.await(gate)
              return yield* new WorkloadIdentity.ExchangeError({ kind: "Transient", status: 503 })
            }
            return accessToken(`t${call}`, yield* Clock.currentTimeMillis)
          })
          const cache = yield* WorkloadIdentity.makeTokenCache({ exchange, policy: anthropicPolicy })
          yield* cache.get
          yield* TestClock.setTime(HOUR - 120_000)
          yield* cache.get // starts background refresh #2, held by the gate
          yield* settle
          yield* cache.invalidateWhen(Redacted.make("t1"))
          yield* Deferred.succeed(gate, undefined)
          yield* settle
          assert.strictEqual(calls, 2)
          assert.deepStrictEqual(warnings, [])
        }).pipe(Effect.scoped, Effect.provide(layer))
      })
    })

    it.effect("invalidateWhen evicts only the token it names", () =>
      Effect.gen(function*() {
        const { calls, exchange } = makeExchange(HOUR)
        const cache = yield* WorkloadIdentity.makeTokenCache({ exchange, policy: anthropicPolicy })
        yield* cache.get
        assert.isFalse(yield* cache.invalidateWhen(Redacted.make("not-cached")))
        assert.strictEqual(value(yield* cache.get), "t1")
        assert.isTrue(yield* cache.invalidateWhen(Redacted.make("t1")))
        assert.strictEqual(value(yield* cache.get), "t2")
        assert.strictEqual(calls(), 2)
      }).pipe(Effect.scoped))

    it.effect("after invalidateWhen, get does not join a refresh started before it", () =>
      Effect.gen(function*() {
        const gate = yield* Deferred.make<void>()
        let calls = 0
        const exchange = Effect.gen(function*() {
          const call = ++calls
          if (call === 2) yield* Deferred.await(gate)
          return accessToken(`t${call}`, yield* Clock.currentTimeMillis)
        })
        const cache = yield* WorkloadIdentity.makeTokenCache({ exchange, policy: anthropicPolicy })
        yield* cache.get
        yield* TestClock.setTime(HOUR - 120_000)
        yield* cache.get // starts background refresh #2, held by the gate
        yield* settle
        yield* cache.invalidateWhen(Redacted.make("t1"))
        assert.strictEqual(value(yield* cache.get), "t3")
        yield* Deferred.succeed(gate, undefined)
        yield* settle
        assert.strictEqual(value(yield* cache.get), "t3")
      }).pipe(Effect.scoped))

    it.effect("interrupting a waiter does not cancel the shared refresh", () =>
      Effect.gen(function*() {
        const gate = yield* Deferred.make<void>()
        const exchange = Effect.as(Deferred.await(gate), accessToken("shared"))
        const cache = yield* WorkloadIdentity.makeTokenCache({ exchange, policy: anthropicPolicy })
        const first = yield* Effect.forkChild(cache.get)
        const second = yield* Effect.forkChild(cache.get)
        yield* settle
        yield* Fiber.interrupt(first)
        yield* Deferred.succeed(gate, undefined)
        assert.strictEqual(value(yield* Fiber.join(second)), "shared")
      }).pipe(Effect.scoped))

    it.effect("closing the scope interrupts a refresh in flight", () =>
      Effect.gen(function*() {
        const interrupted = yield* Deferred.make<void>()
        const exchange = Effect.never.pipe(Effect.onInterrupt(() => Deferred.succeed(interrupted, undefined)))
        const scope = yield* Scope.make()
        const cache = yield* WorkloadIdentity.makeTokenCache({ exchange, policy: anthropicPolicy }).pipe(
          Effect.provideService(Scope.Scope, scope)
        )
        yield* Effect.forkChild(cache.get)
        yield* settle
        yield* Scope.close(scope, Exit.void)
        yield* Deferred.await(interrupted)
      }))

    it.effect("a get after the scope closes is interrupted instead of hanging", () =>
      Effect.gen(function*() {
        const { exchange } = makeExchange(HOUR)
        const scope = yield* Scope.make()
        const cache = yield* WorkloadIdentity.makeTokenCache({ exchange, policy: anthropicPolicy }).pipe(
          Effect.provideService(Scope.Scope, scope)
        )
        yield* Scope.close(scope, Exit.void)
        assert.isTrue(Exit.hasInterrupts(yield* Effect.exit(cache.get)))
        assert.isTrue(Exit.hasInterrupts(yield* Effect.exit(cache.get)))
      }))

    it.effect("an advisory get after the scope closes serves the cached token", () =>
      Effect.gen(function*() {
        const { calls, exchange } = makeExchange(HOUR)
        const scope = yield* Scope.make()
        const cache = yield* WorkloadIdentity.makeTokenCache({ exchange, policy: anthropicPolicy }).pipe(
          Effect.provideService(Scope.Scope, scope)
        )
        yield* cache.get
        yield* Scope.close(scope, Exit.void)
        yield* TestClock.setTime(HOUR - 120_000)
        assert.strictEqual(value(yield* cache.get), "t1")
        yield* settle
        yield* TestClock.setTime(HOUR - 30_000)
        assert.isTrue(Exit.hasInterrupts(yield* Effect.exit(cache.get)))
        assert.isTrue(Exit.hasInterrupts(yield* Effect.exit(cache.get)))
        assert.strictEqual(calls(), 1)
      }))

    it.effect("a failed refresh from before invalidateWhen does not back off the new token", () =>
      Effect.gen(function*() {
        const gate = yield* Deferred.make<void>()
        let calls = 0
        const exchange = Effect.gen(function*() {
          const call = ++calls
          if (call === 2) {
            yield* Deferred.await(gate)
            return yield* new WorkloadIdentity.ExchangeError({ kind: "Transient", status: 503 })
          }
          return accessToken(`t${call}`, yield* Clock.currentTimeMillis, call === 3 ? 60_000 : HOUR)
        })
        const cache = yield* WorkloadIdentity.makeTokenCache({ exchange, policy: anthropicPolicy })
        yield* cache.get
        const t3IssuedAt = HOUR - 120_000
        yield* TestClock.setTime(t3IssuedAt)
        yield* cache.get // starts background refresh #2, held by the gate
        yield* settle
        yield* cache.invalidateWhen(Redacted.make("t1"))
        assert.strictEqual(value(yield* cache.get), "t3")

        // t3 lives 60 seconds, so its advisory window opens 30 seconds after issue.
        yield* TestClock.setTime(t3IssuedAt + 30_000)
        yield* Deferred.succeed(gate, undefined)
        yield* settle
        assert.strictEqual(value(yield* cache.get), "t3")
        yield* settle
        assert.strictEqual(calls, 4)
      }).pipe(Effect.scoped))
  })

  describe("exchange helpers", () => {
    const TOKEN_URL = "https://auth.example.test/token"
    const JWT = "header.payload.signature"
    const policy: WorkloadIdentity.RefreshPolicy = {
      advisory: () => Duration.minutes(2),
      mandatory: () => Duration.seconds(30),
      advisoryFailureBackoff: Duration.seconds(5)
    }

    interface Reply {
      readonly status: number
      readonly body?: unknown
      readonly rawBody?: string
      readonly headers?: Record<string, string>
      // Answers with a body whose stream fails after the headers arrive.
      readonly failBody?: boolean
    }

    // Answers with the scripted replies in order, recording each request and
    // the `FetchHttpClient.RequestInit` it ran with.
    const makeServer = (replies: Array<Reply>) => {
      const requests: Array<HttpClientRequest.HttpClientRequest> = []
      const fetchInits: Array<globalThis.RequestInit | undefined> = []
      const client = HttpClient.makeWith(
        Effect.fnUntraced(function*(requestEffect) {
          const request = yield* requestEffect
          requests.push(request)
          fetchInits.push(Option.getOrUndefined(yield* Effect.serviceOption(FetchHttpClient.RequestInit)))
          const reply = replies.shift() ?? { status: 500 }
          // A fetch with `redirect: "manual"` answers a redirect with an opaque
          // response, whose status is 0; only `Response.error()` can build one.
          if (reply.status === 0) return HttpClientResponse.fromWeb(request, Response.error())
          const body = reply.failBody
            ? new ReadableStream({
              pull(controller) {
                controller.error(new Error("connection reset"))
              }
            })
            : reply.rawBody ?? (reply.body === undefined ? null : JSON.stringify(reply.body))
          return HttpClientResponse.fromWeb(
            request,
            new Response(body, { status: reply.status, headers: reply.headers ?? {} })
          )
        }),
        Effect.succeed as HttpClient.HttpClient.Preprocess<HttpClientError.HttpClientError, never>
      )
      return { client, requests, fetchInits }
    }

    const exchangeRequest = (tokenUrl: string, identityToken: WorkloadIdentity.IdentityToken) =>
      HttpClientRequest.post(tokenUrl).pipe(
        HttpClientRequest.bodyJsonUnsafe({ assertion: Redacted.value(identityToken.token) })
      )

    const assertionOf = (request: HttpClientRequest.HttpClientRequest): unknown => {
      const body = request.body
      assert.strictEqual(body._tag, "Uint8Array")
      return JSON.parse(new TextDecoder().decode((body as { readonly body: Uint8Array }).body)).assertion
    }

    // Whether `secret` is reachable from `value` through own properties, as a
    // string or as encoded bytes.
    const reaches = (value: unknown, secret: string, seen = new Set<unknown>()): boolean => {
      if (typeof value === "string") return value.includes(secret)
      if (value instanceof Uint8Array) return new TextDecoder().decode(value).includes(secret)
      if (typeof value !== "object" || value === null || seen.has(value)) return false
      seen.add(value)
      return Object.getOwnPropertyNames(value).some((key) =>
        key !== "stack" && reaches((value as Record<string, unknown>)[key], secret, seen)
      )
    }

    const execute = (server: ReturnType<typeof makeServer>) =>
      WorkloadIdentity.executeExchange(
        server.client,
        exchangeRequest(TOKEN_URL, { token: Redacted.make(JWT), type: "jwt" }),
        {
          requestIdHeader: "x-request-id"
        }
      )

    const response = (
      status: number,
      body: unknown,
      headers: Record<string, string> = {}
    ): WorkloadIdentity.ExchangeResponse => ({
      status,
      headers: Headers.fromInput(headers),
      body: typeof body === "string" ? body : JSON.stringify(body),
      requestId: "req_1"
    })

    describe("validateTokenUrl", () => {
      it.effect("accepts https and loopback http", () =>
        Effect.gen(function*() {
          for (
            const url of [
              "https://a.test/t",
              "http://localhost:1/t",
              "http://127.0.0.1/t",
              "http://[::1]/t",
              "http://LOCALHOST/t"
            ]
          ) {
            assert.strictEqual(yield* WorkloadIdentity.validateTokenUrl(url), url)
          }
        }))

      it.effect("dies on non-loopback http and unparseable URLs", () =>
        Effect.gen(function*() {
          for (const url of ["http://a.test/t", "http://127.0.0.2/t", "not a url"]) {
            assert.isTrue(Exit.hasDies(yield* Effect.exit(WorkloadIdentity.validateTokenUrl(url))), url)
          }
        }))
    })

    describe("executeExchange", () => {
      it.effect("returns the status, body and request id", () =>
        Effect.gen(function*() {
          const server = makeServer([{ status: 200, rawBody: "ok", headers: { "x-request-id": "req_1" } }])
          const result = yield* execute(server)
          assert.strictEqual(result.status, 200)
          assert.strictEqual(result.body, "ok")
          assert.strictEqual(result.requestId, "req_1")
        }))

      it.effect("runs with manual redirects and keeps other RequestInit fields", () =>
        Effect.gen(function*() {
          const server = makeServer([{ status: 200 }, { status: 200 }])
          yield* execute(server).pipe(
            Effect.provideService(FetchHttpClient.RequestInit, { credentials: "omit", redirect: "follow" })
          )
          yield* execute(server)
          assert.deepStrictEqual(server.fetchInits, [{ credentials: "omit", redirect: "manual" }, {
            redirect: "manual"
          }])
        }))

      it.effect("rejects a redirect without following it", () =>
        Effect.gen(function*() {
          const server = makeServer([{ status: 307, headers: { location: "https://evil.test/t" } }, { status: 200 }])
          const error = yield* Effect.flip(execute(server))
          assert.strictEqual(error.kind, "Rejected")
          assert.strictEqual(error.status, 307)
          assert.strictEqual(error.description, "Token endpoint responded with a redirect, which is not followed")
          assert.strictEqual(server.requests.length, 1)
        }))

      it.effect("treats an opaque redirect as a redirect", () =>
        Effect.gen(function*() {
          const server = makeServer([{ status: 0 }, { status: 200 }])
          const error = yield* Effect.flip(execute(server))
          assert.strictEqual(error.kind, "Rejected")
          assert.strictEqual(error.description, "Token endpoint responded with a redirect, which is not followed")
          assert.strictEqual(server.requests.length, 1)
        }))

      it.effect("reads a response without a body as empty", () =>
        Effect.gen(function*() {
          const server = makeServer([{ status: 401 }])
          const result = yield* execute(server)
          assert.strictEqual(result.status, 401)
          assert.strictEqual(result.body, "")
        }))

      it.effect("rejects a body over 1 MiB", () =>
        Effect.gen(function*() {
          const server = makeServer([{ status: 200, rawBody: "a".repeat(1024 * 1024 + 1) }])
          const error = yield* Effect.flip(execute(server))
          assert.strictEqual(error.kind, "InvalidResponse")
          assert.strictEqual(error.status, 200)
          assert.include(error.message, "1 MiB")
        }))

      it.effect("reports a transport failure as Transient without keeping it", () =>
        Effect.gen(function*() {
          const failing = HttpClient.make((request) =>
            Effect.fail(
              new HttpClientError.HttpClientError({
                reason: new HttpClientError.TransportError({ request, description: "connection refused" })
              })
            )
          )
          const error = yield* WorkloadIdentity.executeExchange(
            failing,
            exchangeRequest(TOKEN_URL, { token: Redacted.make(JWT), type: "jwt" }),
            { requestIdHeader: "x-request-id" }
          ).pipe(Effect.flip)
          assert.strictEqual(error.kind, "Transient")
          assert.isUndefined(error.status)
          assert.isUndefined(error.cause)
          assert.include(error.message, "connection refused")
          assert.isFalse(reaches(error, JWT))
        }))

      it.effect("reports a body-read failure as Transient without a status", () =>
        Effect.gen(function*() {
          const server = makeServer([{ status: 200, failBody: true }])
          const error = yield* Effect.flip(execute(server))
          assert.strictEqual(error.kind, "Transient")
          assert.isUndefined(error.status)
          assert.isFalse(reaches(error, JWT))
        }))
    })

    describe("exchangeFailure", () => {
      it("rejects a 401 with the error type, description and hint", () => {
        const error = WorkloadIdentity.exchangeFailure(
          response(401, { type: "error", error: { type: "authentication_error", message: "Authentication failed" } }),
          { now: 0, hint: (status) => status === 401 ? "Check the rule." : undefined }
        )
        assert.strictEqual(error.kind, "Rejected")
        assert.strictEqual(error.status, 401)
        assert.strictEqual(error.requestId, "req_1")
        assert.strictEqual(error.errorType, "authentication_error")
        assert.strictEqual(error.description, "authentication_error: Authentication failed")
        assert.strictEqual(error.hint, "Check the rule.")
      })

      it("reads only allowlisted fields", () => {
        const error = WorkloadIdentity.exchangeFailure(
          response(400, { error: "invalid_grant", error_description: "bad", assertion: "x.y.z" }),
          { now: 0 }
        )
        assert.strictEqual(error.kind, "Rejected")
        assert.strictEqual(error.description, "invalid_grant: bad")
        assert.notInclude(error.message, "x.y.z")
      })

      it("treats a 429 as Transient with retryAfter", () => {
        const error = WorkloadIdentity.exchangeFailure(response(429, {}, { "retry-after": "3" }), { now: 0 })
        assert.strictEqual(error.kind, "Transient")
        assert.strictEqual(error.status, 429)
        assert.deepStrictEqual(error.retryAfter, Duration.seconds(3))
      })

      it("treats a 503 as Transient", () => {
        const error = WorkloadIdentity.exchangeFailure(response(503, "unavailable"), { now: 0 })
        assert.strictEqual(error.kind, "Transient")
        assert.strictEqual(error.status, 503)
        assert.isUndefined(error.description)
      })

      it("caps the description without splitting a surrogate pair", () => {
        const long = WorkloadIdentity.exchangeFailure(response(400, { error_description: "a".repeat(5000) }), {
          now: 0
        })
        assert.strictEqual(long.description!.length, 2000)
        // The pair straddles the cut, so it must be dropped whole.
        const emoji = WorkloadIdentity.exchangeFailure(
          response(400, { error_description: "a".repeat(1998) + "😀".repeat(10) }),
          { now: 0 }
        )
        const description = emoji.description!
        assert.isAtMost(description.length, 2000)
        const last = description.charCodeAt(description.length - 2)
        assert.isFalse(last >= 0xD800 && last <= 0xDBFF)
      })
    })

    describe("toAiError", () => {
      const options = {
        module: "TestCredentials",
        tokenUrl: TOKEN_URL,
        metadata: (error: WorkloadIdentity.ExchangeError) => ({ test: { requestId: error.requestId ?? null } }),
        rateLimitMetadata: () => ({ test: { rateLimited: true } })
      }

      const map = (error: WorkloadIdentity.ExchangeError | WorkloadIdentity.IdentityTokenError) => {
        const aiError = WorkloadIdentity.toAiError(error, options)
        assert.strictEqual(aiError.module, "TestCredentials")
        assert.strictEqual(aiError.method, "workloadIdentity")
        return aiError.reason
      }

      it("maps an IdentityTokenError to a missing key", () => {
        const reason = map(new WorkloadIdentity.IdentityTokenError({ description: "no token" }))
        assert.strictEqual(reason._tag, "AuthenticationError")
        assert.strictEqual((reason as AiError.AuthenticationError).kind, "MissingKey")
      })

      it("maps Rejected to an invalid key", () => {
        const reason = map(new WorkloadIdentity.ExchangeError({ kind: "Rejected", status: 401, requestId: "r" }))
        assert.strictEqual(reason._tag, "AuthenticationError")
        assert.strictEqual((reason as AiError.AuthenticationError).kind, "InvalidKey")
        assert.deepStrictEqual((reason as AiError.AuthenticationError).metadata, { test: { requestId: "r" } })
      })

      it("maps InvalidResponse", () => {
        const reason = map(new WorkloadIdentity.ExchangeError({ kind: "InvalidResponse", status: 200, requestId: "r" }))
        assert.strictEqual(reason._tag, "InvalidResponseError")
        assert.deepStrictEqual((reason as AiError.InvalidResponseError).metadata, { test: { requestId: "r" } })
      })

      it("maps a Transient 429 to a rate limit", () => {
        const reason = map(
          new WorkloadIdentity.ExchangeError({ kind: "Transient", status: 429, retryAfter: Duration.seconds(3) })
        )
        assert.strictEqual(reason._tag, "RateLimitError")
        assert.deepStrictEqual((reason as AiError.RateLimitError).retryAfter, Duration.seconds(3))
        assert.deepStrictEqual((reason as AiError.RateLimitError).metadata, { test: { rateLimited: true } })
      })

      it("maps a Transient failure without a status to a network error", () => {
        const reason = map(
          new WorkloadIdentity.ExchangeError({ kind: "Transient", description: "Failed to reach the token endpoint" })
        )
        assert.strictEqual(reason._tag, "NetworkError")
        assert.strictEqual((reason as AiError.NetworkError).url, TOKEN_URL)
        assert.strictEqual((reason as AiError.NetworkError).method, "POST")
        assert.isUndefined((reason as AiError.NetworkError).cause)
      })

      it("maps another Transient failure to an internal provider error", () => {
        const reason = map(new WorkloadIdentity.ExchangeError({ kind: "Transient", status: 503, requestId: "r" }))
        assert.strictEqual(reason._tag, "InternalProviderError")
        assert.deepStrictEqual((reason as AiError.InternalProviderError).metadata, { test: { requestId: "r" } })
      })
    })

    describe("makeCredentials", () => {
      const decode = (body: string) => {
        const parsed = JSON.parse(body)
        return Result.succeed({ accessToken: parsed.access_token as string, expiresIn: parsed.expires_in ?? 3600 })
      }

      const authenticate = (credentials: Credentials.Credentials) =>
        credentials.authenticate(HttpClientRequest.get("https://api.example.test/v1"))

      const make = (
        server: ReturnType<typeof makeServer>,
        overrides: Partial<Parameters<typeof WorkloadIdentity.makeCredentials<never>>[0]> = {}
      ) =>
        WorkloadIdentity.makeCredentials({
          tokenUrl: TOKEN_URL,
          identityToken: WorkloadIdentity.fromRedacted(Redacted.make(JWT)),
          request: exchangeRequest,
          requestIdHeader: "x-request-id",
          decode,
          policy,
          module: "TestCredentials",
          metadata: () => ({}),
          rateLimitMetadata: () => ({}),
          spanAttributes: { provider: "test" },
          ...overrides
        }).pipe(Effect.provideService(HttpClient.HttpClient, server.client))

      it.effect("exchanges and authenticates requests with the access token", () =>
        Effect.gen(function*() {
          const server = makeServer([{ status: 200, body: { access_token: "at-1" } }])
          const credentials = yield* make(server)
          const request = yield* authenticate(credentials)
          assert.strictEqual(request.headers["authorization"], "Bearer at-1")
          assert.strictEqual(server.requests[0].url, TOKEN_URL)
          assert.strictEqual(assertionOf(server.requests[0]), JWT)
        }).pipe(Effect.scoped))

      it.effect("expires the token expires_in seconds after the request was sent", () =>
        Effect.gen(function*() {
          const server = makeServer([
            { status: 200, body: { access_token: "at-1", expires_in: 10 } },
            { status: 200, body: { access_token: "at-2", expires_in: 10 } }
          ])
          // The endpoint answers a second later, so expiry must count from
          // before the request.
          const slow = HttpClient.transformResponse(
            server.client,
            Effect.tap(() => TestClock.adjust(Duration.seconds(1)))
          )
          const credentials = yield* make({ ...server, client: slow }, {
            policy: { advisory: () => Duration.zero, mandatory: () => Duration.zero, advisoryFailureBackoff: 0 }
          })
          yield* authenticate(credentials)
          yield* TestClock.adjust(Duration.millis(8_999))
          assert.strictEqual((yield* authenticate(credentials)).headers["authorization"], "Bearer at-1")
          yield* TestClock.adjust(Duration.millis(1))
          assert.strictEqual((yield* authenticate(credentials)).headers["authorization"], "Bearer at-2")
        }).pipe(Effect.scoped))

      it.effect("fails InvalidResponse with the decode failure description", () =>
        Effect.gen(function*() {
          const server = makeServer([{ status: 200, rawBody: "{}", headers: { "x-request-id": "req_1" } }])
          const credentials = yield* make(server, { decode: () => Result.fail("Token endpoint returned junk") })
          const error = yield* Effect.flip(authenticate(credentials))
          assert.strictEqual(error.reason._tag, "InvalidResponseError")
          assert.include(error.message, "with status 200 (request-id req_1): Token endpoint returned junk")
        }).pipe(Effect.scoped))

      it.effect("rejects an access token that cannot be sent in a header without echoing it", () =>
        Effect.gen(function*() {
          for (const token of ["at-1\r\nx-injected: 1", " at-1", "at-1\t", "at-\u00e9"]) {
            const server = makeServer([{ status: 200, body: { access_token: token } }])
            const credentials = yield* make(server)
            const error = yield* Effect.flip(authenticate(credentials))
            assert.strictEqual(error.reason._tag, "InvalidResponseError", token)
            assert.include(error.message, "Token endpoint returned an access token that cannot be sent in a header")
            assert.isFalse(reaches(error, token), token)
          }
        }).pipe(Effect.scoped))

      it.effect("maps a 401 to an AuthenticationError with the hint", () =>
        Effect.gen(function*() {
          const server = makeServer([{ status: 401, body: { error: "invalid_grant" } }])
          const credentials = yield* make(server, {
            hint: (status) => status === 401 ? "Check the federation rule." : undefined
          })
          const error = yield* credentials.authenticate(HttpClientRequest.get("https://api.example.test/v1")).pipe(
            Effect.flip
          )
          assert.strictEqual(error.module, "TestCredentials")
          assert.strictEqual(error.reason._tag, "AuthenticationError")
          assert.include(error.message, "invalid_grant")
          assert.include(error.message, "Check the federation rule.")
        }).pipe(Effect.scoped))

      it.effect("dies on a non-https token URL", () =>
        Effect.gen(function*() {
          const server = makeServer([])
          const exit = yield* Effect.exit(make(server, { tokenUrl: "http://auth.example.test/token" }))
          assert.isTrue(Exit.hasDies(exit))
          assert.strictEqual(server.requests.length, 0)
        }).pipe(Effect.scoped))

      it.effect("retries according to schedule with a fresh identity token", () =>
        Effect.gen(function*() {
          const server = makeServer([{ status: 503 }, { status: 200, body: { access_token: "at-1" } }])
          let n = 0
          const credentials = yield* make(server, {
            identityToken: Effect.sync(() => ({ token: Redacted.make(`jwt-${++n}`), type: "jwt" as const })),
            schedule: Schedule.recurs(1)
          })
          const request = yield* authenticate(credentials)
          assert.strictEqual(request.headers["authorization"], "Bearer at-1")
          assert.deepStrictEqual(server.requests.map(assertionOf), ["jwt-1", "jwt-2"])
        }).pipe(Effect.scoped))

      it.effect("caps Retry-After at maxRetryAfter but reports the server's value", () =>
        Effect.gen(function*() {
          const limited = { status: 429, headers: { "retry-after": "3600" } }
          const server = makeServer([limited, limited])
          const credentials = yield* make(server, { schedule: Schedule.recurs(1), maxRetryAfter: "1 minute" })
          const fiber = yield* Effect.forkChild(Effect.flip(authenticate(credentials)))
          yield* TestClock.adjust(Duration.millis(59_999))
          assert.strictEqual(server.requests.length, 1)
          yield* TestClock.adjust(Duration.millis(1))
          const error = yield* Fiber.join(fiber)
          assert.strictEqual(server.requests.length, 2)
          assert.strictEqual(error.reason._tag, "RateLimitError")
          assert.deepStrictEqual((error.reason as AiError.RateLimitError).retryAfter, Duration.seconds(3600))
        }).pipe(Effect.scoped))
    })
  })
})
