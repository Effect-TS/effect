import * as Effect from "../../Effect.ts"
import * as Schema from "../../Schema.ts"
import * as Stream from "../../Stream.ts"
import { DockerError, InvalidResponse, StreamFailed } from "../DockerError.ts"
import type * as DockerSchema from "../DockerSchema.ts"
import type { Progress } from "./api.ts"

/**
 * What a push reports about the pushed manifest, in the Engine's own field
 * names.
 *
 * @internal
 */
export const PushResult = Schema.Struct({
  Tag: Schema.optionalKey(Schema.String),
  Digest: Schema.optionalKey(Schema.String),
  Size: Schema.optionalKey(Schema.Number)
})

const decodePushResult = Schema.decodeUnknownEffect(Schema.toCodecGoJson(PushResult))

/**
 * The pushed manifest, from the `aux` of a push's progress. Docker's
 * containerd store sends other `aux` data too.
 *
 * @internal
 */
export const pushResultOf = <E, R>(
  messages: Stream.Stream<DockerSchema.ProgressMessage, E, R>,
  operation: string
): Effect.Effect<typeof PushResult.Type, E | DockerError, R> =>
  messages.pipe(
    Stream.runFold(
      () => ({}) as Readonly<Record<string, Schema.Json>>,
      (result, message) =>
        message.aux !== undefined && (message.aux.Digest !== undefined || result.Digest === undefined)
          ? message.aux
          : result
    ),
    Effect.flatMap((aux) =>
      Effect.mapError(decodePushResult(aux), (cause) =>
        new DockerError({ reason: new InvalidResponse({ issue: cause.message, cause }), operation }))
    )
  )

/**
 * The failure a progress or build message reports in band: its `errorDetail`,
 * or the deprecated `error` beside it.
 *
 * @internal
 */
export const inBandError = (
  errorDetail: { readonly message?: string | undefined } | undefined,
  error: string | undefined
): DockerError | undefined => {
  const text = errorDetail?.message ?? error
  return text === undefined && errorDetail === undefined
    ? undefined
    : new DockerError({ reason: new StreamFailed({ message: text ?? "" }) })
}

/**
 * The messages of a progress stream, failing with `StreamFailed` on the first
 * in-band error.
 *
 * @internal
 */
export const failOnError = <E>(
  messages: Stream.Stream<typeof Progress.Type, E>
): Stream.Stream<DockerSchema.ProgressMessage, E | DockerError> =>
  Stream.mapEffect(messages, ({ error, ...message }) => {
    const failure = inBandError(message.errorDetail, error)
    return failure === undefined ? Effect.succeed(message) : Effect.fail(failure)
  })
