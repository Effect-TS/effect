import * as Headers from "@effect/platform/Headers"
import * as HttpClient from "@effect/platform/HttpClient"
import * as HttpClientError from "@effect/platform/HttpClientError"
import * as HttpClientRequest from "@effect/platform/HttpClientRequest"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as FiberSet from "effect/FiberSet"
import * as Num from "effect/Number"
import * as Option from "effect/Option"
import * as Schedule from "effect/Schedule"
import * as Scope from "effect/Scope"

const policy = Schedule.forever.pipe(
  Schedule.passthrough,
  Schedule.addDelay((error) => {
    if (
      HttpClientError.isHttpClientError(error)
      && error._tag === "ResponseError"
      && error.response.status === 429
    ) {
      const retryAfter = Option.fromNullable(error.response.headers["retry-after"]).pipe(
        Option.flatMap(Num.parse),
        Option.getOrElse(() => 5)
      )
      return Duration.seconds(retryAfter)
    }
    return Duration.seconds(1)
  })
)

/** @internal */
export const make: (
  options: {
    readonly url: string
    readonly headers: Headers.Input | undefined
    readonly label: string
    readonly exportInterval: Duration.DurationInput
    readonly maxBatchSize: number | "disabled"
    readonly body: (data: Array<any>) => unknown
  }
) => Effect.Effect<
  { readonly push: (data: unknown) => void },
  never,
  HttpClient.HttpClient | Scope.Scope
> = Effect.fnUntraced(function*(options) {
  const scope = yield* Effect.scope
  const exportInterval = Duration.decode(options.exportInterval)

  const client = HttpClient.filterStatusOk(yield* HttpClient.HttpClient).pipe(
    HttpClient.tapError((error) => {
      if (error._tag !== "ResponseError" || error.response.status !== 429) {
        return Effect.void
      }
      const retryAfter = error.response.headers["retry-after"]
      const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : 5
      return Effect.sleep(Duration.seconds(retryAfterSeconds))
    }),
    HttpClient.retryTransient({ schedule: policy })
  )

  let headers = Headers.unsafeFromRecord({
    "user-agent": `effect-opentelemetry-${options.label}/0.0.0`
  })
  if (options.headers) {
    headers = Headers.merge(Headers.fromInput(options.headers), headers)
  }

  const request = HttpClientRequest.post(options.url, { headers })
  let buffer: Array<any> = []
  const runExport = Effect.suspend(() => {
    const items = buffer
    if (options.maxBatchSize !== "disabled") {
      if (buffer.length === 0) {
        return Effect.void
      }
      buffer = []
    }
    return client.execute(
      HttpClientRequest.bodyUnsafeJson(request, options.body(items))
    ).pipe(
      Effect.asVoid,
      Effect.withTracerEnabled(false)
    )
  })

  yield* Scope.addFinalizer(scope, Effect.ignore(runExport))

  let disabled = false

  yield* Effect.sleep(exportInterval).pipe(
    Effect.zipRight(runExport),
    Effect.forever,
    Effect.catchAllCause((cause) => {
      disabled = true
      return Effect.logDebug("Failed to export", cause)
    }),
    Effect.annotateLogs({
      package: "@effect/opentelemetry",
      module: options.label
    }),
    Effect.forkIn(scope),
    Effect.interruptible
  )

  const runFork = yield* FiberSet.makeRuntime().pipe(
    Effect.interruptible
  )
  return {
    push(data) {
      if (disabled) return
      buffer.push(data)
      if (options.maxBatchSize !== "disabled" && buffer.length >= options.maxBatchSize) {
        runFork(runExport)
      }
    }
  }
})
