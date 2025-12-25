import * as Headers from "@effect/platform/Headers"
import * as HttpBody from "@effect/platform/HttpBody"
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

/**
 * OTLP protocol type for encoding
 * @internal
 */
export type OtlpProtocol = "json" | "protobuf"

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
    readonly bodyProtobuf?: ((data: Array<any>) => Uint8Array) | undefined
    readonly protocol?: OtlpProtocol | undefined
    readonly shutdownTimeout: Duration.DurationInput
  }
) => Effect.Effect<
  { readonly push: (data: unknown) => void },
  never,
  HttpClient.HttpClient | Scope.Scope
> = Effect.fnUntraced(function*(options) {
  const clock = yield* Effect.clock
  const scope = yield* Effect.scope
  const exportInterval = Duration.decode(options.exportInterval)
  let disabledUntil: number | undefined = undefined

  const client = HttpClient.filterStatusOk(yield* HttpClient.HttpClient).pipe(
    HttpClient.retryTransient({ schedule: policy, times: 3 })
  )

  const protocol = options.protocol ?? "json"
  const contentType = protocol === "protobuf"
    ? "application/x-protobuf"
    : "application/json"

  let headers = Headers.unsafeFromRecord({
    "user-agent": `effect-opentelemetry-${options.label}/0.0.0`,
    "content-type": contentType
  })
  if (options.headers) {
    headers = Headers.merge(Headers.fromInput(options.headers), headers)
  }

  const request = HttpClientRequest.post(options.url, { headers })
  let buffer: Array<any> = []
  const runExport = Effect.suspend(() => {
    if (disabledUntil !== undefined && clock.unsafeCurrentTimeMillis() < disabledUntil) {
      return Effect.void
    } else if (disabledUntil !== undefined) {
      disabledUntil = undefined
    }
    const items = buffer
    if (options.maxBatchSize !== "disabled") {
      if (buffer.length === 0) {
        return Effect.void
      }
      buffer = []
    }
    const requestWithBody = protocol === "protobuf" && options.bodyProtobuf
      ? HttpClientRequest.setBody(
        request,
        HttpBody.uint8Array(options.bodyProtobuf(items), contentType)
      )
      : HttpClientRequest.bodyUnsafeJson(request, options.body(items))

    return client.execute(requestWithBody).pipe(
      Effect.asVoid,
      Effect.withTracerEnabled(false)
    )
  }).pipe(
    Effect.catchAllCause((cause) => {
      if (disabledUntil !== undefined) return Effect.void
      disabledUntil = clock.unsafeCurrentTimeMillis() + Duration.toMillis("1 minute")
      return Effect.logDebug(`Disabling ${options.label} for 60 seconds`, cause)
    })
  )

  yield* Scope.addFinalizer(
    scope,
    runExport.pipe(
      Effect.ignore,
      Effect.interruptible,
      Effect.timeoutOption(options.shutdownTimeout)
    )
  )

  yield* Effect.sleep(exportInterval).pipe(
    Effect.zipRight(runExport),
    Effect.forever,
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
      if (disabledUntil !== undefined) return
      buffer.push(data)
      if (options.maxBatchSize !== "disabled" && buffer.length >= options.maxBatchSize) {
        runFork(runExport)
      }
    }
  }
})
