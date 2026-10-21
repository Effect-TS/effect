import { OperationHttp, OperationHttpServer, Operations } from "@effect/auth"
import { assert, it } from "@effect/vitest"
import { Cause, Effect, Exit, Logger, Schema } from "effect"

class Rejected extends Schema.TaggedError<Rejected>()("Rejected", {}) {}

const operation = Operations.makeOperation("test/failure-boundary", {
  payload: Schema.Void,
  success: Schema.Void,
  error: Rejected,
  access: "any",
  exposure: "public",
  replay: "read-only"
})

const origin = "https://example.test"

const server = OperationHttpServer.make(
  OperationHttp.make({ read: OperationHttp.route(operation, { path: "/read" }) })
)

const request = () =>
  new Request(`${origin}/read`, {
    method: "POST",
    headers: { origin, "content-type": "application/json", "x-csrf": "1" },
    body: "{}"
  })

const configuration = OperationHttpServer.configurationLayer({
  publicOrigin: origin,
  trustedOrigins: [origin],
  cookies: OperationHttpServer.cookieConfiguration({ prefix: "__Host-test-", secure: true }),
  csrfHeader: "x-csrf",
  csrfValue: "1",
  maximumBodyBytes: 65536,
  maximumUrlBytes: 8192
})

// The first-error recovery in 2ff581df and 5d5f461a hides concurrent failures.
// Live requests cannot reliably force these composite Causes; exercise the
// public operation and transport boundaries without mocking their internals.
it.effect("reports a mixed operation failure once across the HTTP boundary", () =>
  Effect.gen(function*() {
    const captured: Array<Cause.Cause<unknown>> = []
    const logs = Logger.layer([Logger.make((entry) => captured.push(entry.cause))])

    const mixed = Cause.fromReasons([
      Cause.makeFailReason(Rejected.make({})),
      Cause.makeDieReason(new Error("private-operation-cause"))
    ])

    const handlers = operation.handlerLayer(() => Effect.failCause(mixed))

    const http = yield* server.pipe(
      Effect.provide([
        configuration,
        OperationHttpServer.invocationLayer(() => Effect.succeed(Operations.guest))
      ])
    )

    const response = yield* http.handle(request()).pipe(Effect.provide([handlers, logs]))

    assert.strictEqual(response.status, 503)
    assert.lengthOf(captured, 1)
    assert.deepStrictEqual(captured[0]?.reasons.map((reason) => reason._tag), ["Fail", "Die"])
    assert.notInclude(JSON.stringify(captured), "private-operation-cause")
    assert.notInclude(yield* Effect.promise(() => response.text()), "private-operation-cause")
  }))

it.effect("keeps interruption when an operation also fails with a declared error", () =>
  Effect.gen(function*() {
    const mixed = Cause.fromReasons([
      Cause.makeFailReason(Rejected.make({})),
      Cause.makeInterruptReason(123)
    ])

    const result = yield* Effect.exit(
      operation
        .invoke(Operations.guest, undefined)
        .pipe(Effect.provide(operation.handlerLayer(() => Effect.failCause(mixed))))
    )

    assert.strictEqual(Exit.isFailure(result) && Cause.hasInterrupts(result.cause), true)
  }))

it.effect("keeps interruption when declared error projection fails", () =>
  Effect.gen(function*() {
    const invalid = Operations.makeOperation("test/invalid-error", {
      payload: Schema.Void,
      success: Schema.Void,
      error: Schema.NonEmptyString,
      access: "any",
      replay: "read-only"
    })

    const result = yield* Effect.exit(
      invalid
        .invoke(Operations.guest, undefined)
        .pipe(
          Effect.provide([
            invalid.handlerLayer(() =>
              Effect.failCause(
                Cause.fromReasons([Cause.makeFailReason(""), Cause.makeInterruptReason(123)])
              )
            ),
            Logger.layer([])
          ])
        )
    )

    assert.strictEqual(Exit.isFailure(result) && Cause.hasInterrupts(result.cause), true)
  }))

it.effect("keeps an already-failed request body a quiet request rejection", () =>
  Effect.gen(function*() {
    const captured: Array<Cause.Cause<unknown>> = []

    const http = yield* server.pipe(
      Effect.provide([
        configuration,
        OperationHttpServer.invocationLayer(() => Effect.succeed(Operations.guest))
      ])
    )

    const init = {
      method: "POST",
      headers: { origin, "content-type": "application/json", "x-csrf": "1" },
      body: new ReadableStream({
        start(controller) {
          controller.error(new Error("private-body"))
        }
      }),
      duplex: "half"
    } satisfies RequestInit & { duplex: string }

    const response = yield* http
      .handle(new Request(`${origin}/read`, init))
      .pipe(
        Effect.provide([
          operation.handlerLayer(() => Effect.void),
          Logger.layer([Logger.make((entry) => captured.push(entry.cause))])
        ])
      )

    assert.strictEqual(response.status, 400)
    assert.lengthOf(captured, 0)
  }))

it.effect("reports resolver defects before translating a typed HTTP error", () =>
  Effect.gen(function*() {
    const captured: Array<Cause.Cause<unknown>> = []

    const mixed = Cause.fromReasons([
      Cause.makeFailReason(OperationHttp.OperationHttpError.make({ reason: "credentials" })),
      Cause.makeDieReason(new Error("private-resolver-cause"))
    ])

    const http = yield* server.pipe(
      Effect.provide([
        configuration,
        OperationHttpServer.invocationLayer(() => Effect.failCause(mixed))
      ])
    )

    const response = yield* http
      .handle(request())
      .pipe(
        Effect.provide([
          operation.handlerLayer(() => Effect.void),
          Logger.layer([Logger.make((entry) => captured.push(entry.cause))])
        ])
      )

    assert.strictEqual(response.status, 503)
    assert.lengthOf(captured, 1)
    assert.deepStrictEqual(captured[0]?.reasons.map((reason) => reason._tag), ["Fail", "Die"])
    assert.notInclude(JSON.stringify(captured), "private-resolver-cause")
  }))
