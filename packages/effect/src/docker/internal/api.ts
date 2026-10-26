import * as Option from "../../Option.ts"
import * as Schema from "../../Schema.ts"
import * as DockerSchema from "../DockerSchema.ts"

const decodeErrorBody = Schema.decodeUnknownOption(Schema.fromJsonString(DockerSchema.ErrorResponse))

/**
 * The message of an error response's body: the Engine's `{ message }` JSON,
 * otherwise the trimmed text, such as a proxy's.
 *
 * @internal
 */
export const errorMessage = (body: string): string =>
  Option.match(decodeErrorBody(body), { onNone: () => body.trim(), onSome: ({ message }) => message })

/**
 * A progress message; the Engine still sends the deprecated `error` beside
 * `errorDetail`.
 *
 * @internal
 */
export const Progress = Schema.toCodecGoJson(
  DockerSchema.ProgressMessage.mapFields((fields) => ({ ...fields, error: Schema.optionalKey(Schema.String) }))
)

/**
 * A build's messages: progress messages whose `aux` can be any JSON
 * (BuildKit's trace is a string).
 *
 * @internal
 */
export const BuildMessage = Schema.toCodecGoJson(
  DockerSchema.ProgressMessage.mapFields((fields) => ({
    ...fields,
    error: Schema.optionalKey(Schema.String),
    aux: Schema.optionalKey(Schema.Json)
  }))
)
