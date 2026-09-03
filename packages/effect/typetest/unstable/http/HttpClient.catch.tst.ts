import { Context, Effect } from "effect"
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"
import { describe, expect, it } from "tstyche"

type Response = HttpClientResponse.HttpClientResponse
type SourceError = "source" | "secondary"
type RecoveryError = "recovery" | "other"

class SourceContext extends Context.Service<SourceContext, string>()("test/HttpClient/SourceContext") {}
class RecoveryContext extends Context.Service<RecoveryContext, Response>()("test/HttpClient/RecoveryContext") {}
class RecoveryExtraContext
  extends Context.Service<RecoveryExtraContext, boolean>()("test/HttpClient/RecoveryExtraContext")
{}

const request = HttpClientRequest.get("https://fixture.invalid/catch")
const response = HttpClientResponse.fromWeb(request, new globalThis.Response(null, { status: 200 }))
const subtype = Object.assign(response, { fixture: "response" })
const failure = Effect.flatMap(SourceContext, () => Effect.fail<SourceError>("source"))
const failed = HttpClient.makeWith(() => failure, Effect.succeed)
const plainFailed = HttpClient.makeWith(() => Effect.fail<SourceError>("source"), Effect.succeed)
const successful = HttpClient.makeWith(() => Effect.succeed(response), Effect.succeed)

const recovery = (_error: SourceError) =>
  Effect.gen(function*() {
    const fallback = yield* RecoveryContext
    const shouldFail = yield* RecoveryExtraContext
    if (shouldFail) {
      return yield* Effect.fail<RecoveryError>("recovery")
    }
    return fallback
  })
const neverRecovery = (_error: SourceError) =>
  Effect.flatMap(RecoveryExtraContext, () => Effect.fail<RecoveryError>("other"))

describe("HttpClient.catch", () => {
  it("rejects a number recovery in data-first form", () => {
    expect(HttpClient.catch).type.not.toBeCallableWith(plainFailed, () => Effect.succeed(123))
  })

  it("rejects an undefined recovery in data-first form", () => {
    expect(HttpClient.catch).type.not.toBeCallableWith(plainFailed, () => Effect.succeed(undefined))
  })

  it("already rejects non-response recoveries in data-last form", () => {
    expect(HttpClient.catch).type.not.toBeCallableWith((_error: SourceError) => Effect.succeed(123))
    expect(HttpClient.catch).type.not.toBeCallableWith((_error: SourceError) => Effect.succeed(undefined))
  })

  it("starts with a valid typed producer and callable failure client", () => {
    expect(failure).type.toBe<Effect.Effect<never, SourceError, SourceContext>>()
    expect(failed).type.toBe<HttpClient.HttpClient.With<SourceError, SourceContext>>()
    expect(failed.execute).type.toBeCallableWith(request)
    expect(failed.execute(request)).type.toBe<Effect.Effect<Response, SourceError, SourceContext>>()
    const assigned: HttpClient.HttpClient.With<SourceError, SourceContext> = failed
    expect(assigned.execute(request)).type.toBe<Effect.Effect<Response, SourceError, SourceContext>>()
    expect(plainFailed).type.toBe<HttpClient.HttpClient.With<SourceError>>()
    expect(successful).type.toBe<HttpClient.HttpClient.With<never>>()
    expect(successful.execute(request)).type.toBe<Effect.Effect<Response>>()
  })

  it("accepts actual responses and subtypes in both forms", () => {
    expect(response).type.toBe<Response>()
    expect(subtype).type.toBeAssignableTo<Response>()
    expect(HttpClient.catch).type.toBeCallableWith(failed, () => Effect.succeed(response))
    expect(HttpClient.catch).type.toBeCallableWith(failed, () => Effect.succeed(subtype))
    expect(HttpClient.catch).type.toBeCallableWith((_error: SourceError) => Effect.succeed(response))
    expect(HttpClient.catch).type.toBeCallableWith((_error: SourceError) => Effect.succeed(subtype))
    const direct = HttpClient.catch(failed, () => Effect.succeed(response))
    const curried = failed.pipe(HttpClient.catch((_error: SourceError) => Effect.succeed(response)))
    const directSubtype = HttpClient.catch(failed, () => Effect.succeed(subtype))
    const curriedSubtype = failed.pipe(HttpClient.catch((_error: SourceError) => Effect.succeed(subtype)))
    expect(direct).type.toBe<HttpClient.HttpClient.With<never, SourceContext>>()
    expect(curried).type.toBe<typeof direct>()
    expect(directSubtype).type.toBe<typeof direct>()
    expect(curriedSubtype).type.toBe<typeof direct>()
    expect(direct.execute(request)).type.toBe<Effect.Effect<Response, never, SourceContext>>()
    expect(curriedSubtype.execute(request)).type.toBe<Effect.Effect<Response, never, SourceContext>>()
  })

  it("infers input errors and replaces the error channel while unioning requirements", () => {
    expect(recovery("source")).type.toBe<
      Effect.Effect<Response, RecoveryError, RecoveryContext | RecoveryExtraContext>
    >()
    expect(HttpClient.catch).type.toBeCallableWith(failed, recovery)
    const direct = HttpClient.catch(failed, (error) => {
      expect(error).type.toBe<SourceError>()
      return recovery(error)
    })
    const curried = failed.pipe(HttpClient.catch(recovery))
    expect(direct).type.toBe<
      HttpClient.HttpClient.With<RecoveryError, SourceContext | RecoveryContext | RecoveryExtraContext>
    >()
    expect(curried).type.toBe<typeof direct>()
    expect(direct.execute(request)).type.toBe<
      Effect.Effect<Response, RecoveryError, SourceContext | RecoveryContext | RecoveryExtraContext>
    >()
    const assigned: HttpClient.HttpClient.With<
      RecoveryError,
      SourceContext | RecoveryContext | RecoveryExtraContext
    > = direct
    expect(assigned.execute).type.toBeCallableWith(request)
    expect(assigned.execute(request)).type.toBe<
      Effect.Effect<Response, RecoveryError, SourceContext | RecoveryContext | RecoveryExtraContext>
    >()
    const provided = direct.execute(request).pipe(
      Effect.provideService(SourceContext, "source context"),
      Effect.provideService(RecoveryContext, response),
      Effect.provideService(RecoveryExtraContext, false)
    )
    expect(provided).type.toBe<Effect.Effect<Response, RecoveryError>>()
  })

  it("accepts never-success recovery and keeps its error and context", () => {
    expect(neverRecovery("source")).type.toBe<Effect.Effect<never, RecoveryError, RecoveryExtraContext>>()
    expect(HttpClient.catch).type.toBeCallableWith(failed, neverRecovery)
    expect(HttpClient.catch).type.toBeCallableWith(neverRecovery)
    const direct = HttpClient.catch(failed, neverRecovery)
    const curried = failed.pipe(HttpClient.catch(neverRecovery))
    expect(direct).type.toBe<HttpClient.HttpClient.With<RecoveryError, SourceContext | RecoveryExtraContext>>()
    expect(curried).type.toBe<typeof direct>()
    expect(direct.execute(request)).type.toBe<
      Effect.Effect<Response, RecoveryError, SourceContext | RecoveryExtraContext>
    >()
    const plain = HttpClient.catch(plainFailed, () => Effect.fail<RecoveryError>("recovery"))
    expect(plain).type.toBe<HttpClient.HttpClient.With<RecoveryError>>()
    const defect = HttpClient.catch(plainFailed, () => Effect.die("synthetic defect"))
    expect(defect).type.toBe<HttpClient.HttpClient.With<never>>()
    expect(defect.execute(request)).type.toBe<Effect.Effect<Response>>()
  })

  it("preserves valid explicit five-generic data-first calls", () => {
    const direct = HttpClient.catch<
      SourceError,
      SourceContext,
      Response,
      RecoveryError,
      RecoveryContext | RecoveryExtraContext
    >(failed, recovery)
    const neverDirect = HttpClient.catch<
      SourceError,
      SourceContext,
      never,
      RecoveryError,
      RecoveryExtraContext
    >(failed, neverRecovery)
    expect(direct).type.toBe<
      HttpClient.HttpClient.With<RecoveryError, SourceContext | RecoveryContext | RecoveryExtraContext>
    >()
    expect(neverDirect).type.toBe<HttpClient.HttpClient.With<RecoveryError, SourceContext | RecoveryExtraContext>>()
    expect(direct.execute(request)).type.toBe<
      Effect.Effect<Response, RecoveryError, SourceContext | RecoveryContext | RecoveryExtraContext>
    >()
    expect(neverDirect.execute(request)).type.toBe<
      Effect.Effect<Response, RecoveryError, SourceContext | RecoveryExtraContext>
    >()
  })

  it("preserves saved data-last overloads and explicit three-generic calls", () => {
    const saved = HttpClient.catch(recovery)
    const explicit = HttpClient.catch<SourceError, RecoveryError, RecoveryContext | RecoveryExtraContext>(recovery)
    const savedNever = HttpClient.catch<SourceError, RecoveryError, RecoveryExtraContext>(neverRecovery)
    expect(saved).type.toBe<
      <R>(
        self: HttpClient.HttpClient.With<SourceError, R>
      ) => HttpClient.HttpClient.With<RecoveryError, RecoveryContext | RecoveryExtraContext | R>
    >()
    expect(explicit).type.toBe<typeof saved>()
    expect(saved).type.toBeCallableWith(failed)
    expect(saved).type.toBeCallableWith(plainFailed)
    expect(saved(failed)).type.toBe<
      HttpClient.HttpClient.With<RecoveryError, SourceContext | RecoveryContext | RecoveryExtraContext>
    >()
    expect(saved(plainFailed)).type.toBe<
      HttpClient.HttpClient.With<RecoveryError, RecoveryContext | RecoveryExtraContext>
    >()
    expect(savedNever(failed)).type.toBe<
      HttpClient.HttpClient.With<RecoveryError, SourceContext | RecoveryExtraContext>
    >()
  })

  it("accepts a never error input and preserves the advertised response output", () => {
    const direct = HttpClient.catch(successful, (error) => {
      expect(error).type.toBe<never>()
      return Effect.succeed(response)
    })
    const curried = successful.pipe(HttpClient.catch((_error: never) => Effect.succeed(response)))
    expect(direct).type.toBe<HttpClient.HttpClient.With<never>>()
    expect(curried).type.toBe<typeof direct>()
    expect(direct.execute(request)).type.toBe<Effect.Effect<Response>>()
  })
})
