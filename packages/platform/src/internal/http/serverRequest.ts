import type * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FormData from "../../Http/FormData.js"
import * as IncomingMessage from "../../Http/IncomingMessage.js"
import * as Error from "../../Http/ServerError.js"
import type * as ServerRequest from "../../Http/ServerRequest.js"

/** @internal */
export const TypeId: ServerRequest.TypeId = Symbol.for("@effect/platform/Http/ServerRequest") as ServerRequest.TypeId

/** @internal */
export const serverRequestTag = Context.Tag<ServerRequest.ServerRequest>(TypeId)

/** @internal */
export const persistedFormData = Effect.flatMap(serverRequestTag, (request) => request.formData)

/** @internal */
export const schemaHeaders = <I extends Readonly<Record<string, string>>, A>(schema: Schema.Schema<I, A>) => {
  const parse = IncomingMessage.schemaHeaders(schema)
  return Effect.flatMap(serverRequestTag, parse)
}

/** @internal */
export const schemaBodyJson = <I, A>(schema: Schema.Schema<I, A>) => {
  const parse = IncomingMessage.schemaBodyJson(schema)
  return Effect.flatMap(serverRequestTag, parse)
}

/** @internal */
export const schemaBodyUrlParams = <I extends Readonly<Record<string, string>>, A>(schema: Schema.Schema<I, A>) => {
  const parse = IncomingMessage.schemaBodyUrlParams(schema)
  return Effect.flatMap(serverRequestTag, parse)
}

/** @internal */
export const schemaFormData = <I extends FormData.PersistedFormData, A>(
  schema: Schema.Schema<I, A>
) => {
  const parse = FormData.schemaPersisted(schema)
  return Effect.flatMap(persistedFormData, parse)
}

/** @internal */
export const schemaFormDataJson = <I, A>(schema: Schema.Schema<I, A>) => {
  const parse = FormData.schemaJson(schema)
  return (field: string) =>
    Effect.flatMap(serverRequestTag, (request) =>
      Effect.flatMap(
        request.formData,
        (formData) =>
          Effect.catchTag(
            parse(formData, field),
            "FormDataError",
            (error) =>
              Effect.fail(
                Error.RequestError({
                  reason: "Decode",
                  request,
                  error: error.error
                })
              )
          )
      ))
}
