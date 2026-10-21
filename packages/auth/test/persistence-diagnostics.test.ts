import { reportPersistenceFailure } from "@effect/auth/Persistence"
import { assert, it } from "@effect/vitest"
import { Cause, Console, Context, Effect, Exit, Logger } from "effect"
import { AuthenticationError, ConnectionError, SqlError } from "effect/sql/SqlError"

// Regression in 525916648e47ad1807aef1adba58783e525b6d33: SQL failures lose
// their category at the public reporter. Live auth cannot force mixed causes
// with private metadata or verify the unchanged original error identities.
it.effect("retains SQL diagnostics without exposing private values or changing a mixed cause", () =>
  Effect.gen(function*() {
    const expected = { _tag: "ExpectedRejection", message: "private-expected" } as const

    const connection = SqlError.make({
      reason: ConnectionError.make({
        cause: { code: "ECONNRESET", message: "private-driver", query: "private-query" },
        message: "private-message",
        operation: "private-operation"
      })
    })

    const authentication = SqlError.make({
      reason: AuthenticationError.make({ cause: { code: "private-code" } })
    })

    const hostile = {
      "~effect/sql/SqlError": "~effect/sql/SqlError",
      get reason(): never {
        throw new Error("private-getter")
      }
    }

    const hostilePrototype = new Proxy(
      {},
      {
        getPrototypeOf() {
          throw new Error("private-prototype")
        }
      }
    )

    const annotation = Context.Service<string>("private-annotation")

    const original = Cause.fromReasons<typeof expected | SqlError>([
      Cause.makeFailReason(expected),
      Cause.makeFailReason(connection).annotate(Context.make(annotation, "private-value")),
      Cause.makeDieReason(authentication),
      Cause.makeDieReason(hostile),
      Cause.makeDieReason(hostilePrototype),
      Cause.makeInterruptReason(123)
    ])

    const reported: Array<Cause.Cause<unknown>> = []
    const formatted: Array<string> = []

    const logging = Logger.layer([
      Logger.make((entry) => {
        reported.push(entry.cause)
        formatted.push(JSON.stringify(Logger.formatStructured.log(entry)))
      })
    ])

    const run = <E>(cause: Cause.Cause<E>) =>
      reportPersistenceFailure(Effect.failCause(cause), (error) => error === expected)

    const result = yield* Effect.exit(run(original).pipe(Effect.provide(logging)))

    assert.deepEqual(Exit.isFailure(result) && result.cause, original)
    assert.lengthOf(reported, 1)
    assert.containSubset(reported[0]?.reasons, [
      { _tag: "Fail", error: { reason: "ConnectionError", code: "ECONNRESET" } },
      { _tag: "Die", defect: { reason: "AuthenticationError" } },
      { _tag: "Die", defect: { message: "Auth auth-persistence failed" } },
      { _tag: "Die", defect: { message: "Auth auth-persistence failed" } }
    ])
    assert.notInclude(JSON.stringify(reported), "private-")
    assert.notInclude(formatted.join(" "), "private-")

    yield* Effect.exit(run(Cause.fail(expected)).pipe(Effect.provide(logging)))
    yield* Effect.exit(run(Cause.interrupt(123)).pipe(Effect.provide(logging)))
    assert.lengthOf(reported, 1)

    const brokenLogger = Logger.layer([
      Logger.make(() => {
        throw new Error("private-logger")
      })
    ])

    const fallback: Array<ReadonlyArray<unknown>> = []
    const currentConsole = yield* Console.Console

    const afterLoggerFailure = yield* Effect.exit(
      run(original).pipe(
        Effect.provide(brokenLogger),
        Effect.provideService(Console.Console, {
          ...currentConsole,
          error: (...args) => {
            fallback.push(args)
          }
        })
      )
    )

    assert.deepEqual(Exit.isFailure(afterLoggerFailure) && afterLoggerFailure.cause, original)
    assert.lengthOf(fallback, 1)
    assert.notInclude(JSON.stringify(fallback), "private-")

    const bothBroken = yield* Effect.exit(
      run(original).pipe(
        Effect.provide(brokenLogger),
        Effect.provideService(Console.Console, {
          ...currentConsole,
          error: () => {
            throw new Error("private-console")
          }
        })
      )
    )

    assert.deepEqual(Exit.isFailure(bothBroken) && bothBroken.cause, original)
  }))
