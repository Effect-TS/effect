import * as Schema from "@effect/schema/Schema"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Stream_ from "effect/Stream"
import type * as PlatformError from "../../Error.js"
import * as FileSystem from "../../FileSystem.js"
import type * as Body from "../../Http/Body.js"
import * as UrlParams from "../../Http/UrlParams.js"

/** @internal */
export const TypeId: Body.TypeId = Symbol.for(
  "@effect/platform/Http/Body"
) as Body.TypeId

/** @internal */
export const ErrorTypeId: Body.ErrorTypeId = Symbol.for(
  "@effect/platform/Http/Body/BodyError"
) as Body.ErrorTypeId

const bodyError = Data.tagged<Body.BodyError>("BodyError")

/** @internal */
export const BodyError = (reason: Body.BodyErrorReason): Body.BodyError =>
  bodyError({ [ErrorTypeId]: ErrorTypeId, reason })

class EmptyImpl implements Body.Empty {
  readonly [TypeId]: Body.TypeId
  readonly _tag = "Empty"
  constructor() {
    this[TypeId] = TypeId
  }
}

/** @internal */
export const empty: Body.Empty = new EmptyImpl()

class RawImpl implements Body.Raw {
  readonly [TypeId]: Body.TypeId
  readonly _tag = "Raw"
  constructor(
    readonly body: unknown,
    readonly contentType?: string,
    readonly contentLength?: number
  ) {
    this[TypeId] = TypeId
  }
}

/** @internal */
export const raw = (body: unknown, contentType?: string, contentLength?: number): Body.Raw =>
  new RawImpl(body, contentType, contentLength)

class Uint8ArrayImpl implements Body.Uint8Array {
  readonly [TypeId]: Body.TypeId
  readonly _tag = "Uint8Array"
  constructor(
    readonly body: Uint8Array,
    readonly contentType: string
  ) {
    this[TypeId] = TypeId
  }
  get contentLength(): number {
    return this.body.length
  }
}

/** @internal */
export const uint8Array = (body: Uint8Array, contentType?: string): Body.Uint8Array =>
  new Uint8ArrayImpl(body, contentType ?? "application/octet-stream")

const encoder = new TextEncoder()

/** @internal */
export const text = (body: string, contentType?: string): Body.Uint8Array =>
  uint8Array(encoder.encode(body), contentType ?? "text/plain")

/** @internal */
export const unsafeJson = (body: unknown): Body.Uint8Array => text(JSON.stringify(body), "application/json")

/** @internal */
export const json = (body: unknown): Effect.Effect<never, Body.BodyError, Body.Uint8Array> =>
  Effect.try({
    try: () => unsafeJson(body),
    catch: (error) => BodyError({ _tag: "JsonError", error })
  })

/** @internal */
export const urlParams = (urlParams: UrlParams.UrlParams): Body.Uint8Array =>
  text(UrlParams.toString(urlParams), "application/x-www-form-urlencoded")

/** @internal */
export const jsonSchema = <I, A>(schema: Schema.Schema<I, A>) => {
  const encode = Schema.encode(schema)
  return (body: A): Effect.Effect<never, Body.BodyError, Body.Uint8Array> =>
    Effect.flatMap(
      Effect.mapError(encode(body), (error) => BodyError({ _tag: "SchemaError", error })),
      json
    )
}

/** @internal */
export const file = (
  path: string,
  options?: FileSystem.StreamOptions & { readonly contentType?: string }
): Effect.Effect<FileSystem.FileSystem, PlatformError.PlatformError, Body.Stream> =>
  Effect.flatMap(
    FileSystem.FileSystem,
    (fs) =>
      Effect.map(fs.stat(path), (info) =>
        stream(
          fs.stream(path, options),
          options?.contentType,
          Number(info.size)
        ))
  )

/** @internal */
export const fileInfo = (
  path: string,
  info: FileSystem.File.Info,
  options?: FileSystem.StreamOptions & { readonly contentType?: string }
): Effect.Effect<FileSystem.FileSystem, PlatformError.PlatformError, Body.Stream> =>
  Effect.map(
    FileSystem.FileSystem,
    (fs) =>
      stream(
        fs.stream(path, options),
        options?.contentType,
        Number(info.size)
      )
  )

/** @internal */
export const fileWeb = (file: Body.Body.FileLike): Body.Stream =>
  stream(Stream_.fromReadableStream(() => file.stream() as ReadableStream<Uint8Array>, identity), file.type, file.size)

class FormDataImpl implements Body.FormData {
  readonly [TypeId]: Body.TypeId
  readonly _tag = "FormData"
  constructor(
    readonly formData: FormData
  ) {
    this[TypeId] = TypeId
  }
}

/** @internal */
export const formData = (body: FormData): Body.FormData => new FormDataImpl(body)

class StreamImpl implements Body.Stream {
  readonly [TypeId]: Body.TypeId
  readonly _tag = "Stream"
  constructor(
    readonly stream: Stream_.Stream<never, unknown, Uint8Array>,
    readonly contentType: string,
    readonly contentLength?: number
  ) {
    this[TypeId] = TypeId
  }
}

/** @internal */
export const stream = (
  body: Stream_.Stream<never, unknown, Uint8Array>,
  contentType?: string,
  contentLength?: number
): Body.Stream => new StreamImpl(body, contentType ?? "application/octet-stream", contentLength)
