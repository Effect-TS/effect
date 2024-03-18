import * as Schema from "@effect/schema/Schema"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { identity } from "effect/Function"
import * as Inspectable from "effect/Inspectable"
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

abstract class BodyBase implements Body.Body.Proto {
  readonly [TypeId]: Body.TypeId
  abstract readonly _tag: string
  constructor() {
    this[TypeId] = TypeId
  }
  abstract toJSON(): unknown
  [Inspectable.NodeInspectSymbol](): unknown {
    return this.toJSON()
  }
  toString(): string {
    return Inspectable.format(this)
  }
}

class EmptyImpl extends BodyBase implements Body.Empty {
  readonly _tag = "Empty"
  toJSON(): unknown {
    return {
      _id: "@effect/platform/Http/Body",
      _tag: "Empty"
    }
  }
}

/** @internal */
export const empty: Body.Empty = new EmptyImpl()

class RawImpl extends BodyBase implements Body.Raw {
  readonly _tag = "Raw"
  constructor(
    readonly body: unknown,
    readonly contentType?: string | undefined,
    readonly contentLength?: number | undefined
  ) {
    super()
  }
  toJSON(): unknown {
    return {
      _id: "@effect/platform/Http/Body",
      _tag: "Raw",
      body: this.body,
      contentType: this.contentType,
      contentLength: this.contentLength
    }
  }
}

/** @internal */
export const raw = (body: unknown, options?: {
  readonly contentType?: string | undefined
  readonly contentLength?: number | undefined
}): Body.Raw => new RawImpl(body, options?.contentType, options?.contentLength)

class Uint8ArrayImpl extends BodyBase implements Body.Uint8Array {
  readonly _tag = "Uint8Array"
  constructor(
    readonly body: Uint8Array,
    readonly contentType: string
  ) {
    super()
  }
  get contentLength(): number {
    return this.body.length
  }
  toJSON(): unknown {
    const toString = this.contentType.startsWith("text/") || this.contentType.endsWith("json")
    return {
      _id: "@effect/platform/Http/Body",
      _tag: "Uint8Array",
      body: toString ? new TextDecoder().decode(this.body) : `Uint8Array(${this.body.length})`,
      contentType: this.contentType,
      contentLength: this.contentLength
    }
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
export const json = (body: unknown): Effect.Effect<Body.Uint8Array, Body.BodyError> =>
  Effect.try({
    try: () => unsafeJson(body),
    catch: (error) => BodyError({ _tag: "JsonError", error })
  })

/** @internal */
export const urlParams = (urlParams: UrlParams.UrlParams): Body.Uint8Array =>
  text(UrlParams.toString(urlParams), "application/x-www-form-urlencoded")

/** @internal */
export const jsonSchema = <A, I, R>(schema: Schema.Schema<A, I, R>) => {
  const encode = Schema.encode(schema)
  return (body: A): Effect.Effect<Body.Uint8Array, Body.BodyError, R> =>
    Effect.flatMap(
      Effect.mapError(encode(body), (error) => BodyError({ _tag: "SchemaError", error })),
      json
    )
}

/** @internal */
export const file = (
  path: string,
  options?: FileSystem.StreamOptions & { readonly contentType?: string }
): Effect.Effect<Body.Stream, PlatformError.PlatformError, FileSystem.FileSystem> =>
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
): Effect.Effect<Body.Stream, PlatformError.PlatformError, FileSystem.FileSystem> =>
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

class FormDataImpl extends BodyBase implements Body.FormData {
  readonly _tag = "FormData"
  constructor(
    readonly formData: FormData
  ) {
    super()
  }
  toJSON(): unknown {
    return {
      _id: "@effect/platform/Http/Body",
      _tag: "FormData",
      formData: this.formData
    }
  }
}

/** @internal */
export const formData = (body: FormData): Body.FormData => new FormDataImpl(body)

class StreamImpl extends BodyBase implements Body.Stream {
  readonly _tag = "Stream"
  constructor(
    readonly stream: Stream_.Stream<Uint8Array, unknown>,
    readonly contentType: string,
    readonly contentLength?: number | undefined
  ) {
    super()
  }
  toJSON(): unknown {
    return {
      _id: "@effect/platform/Http/Body",
      _tag: "Stream",
      contentType: this.contentType,
      contentLength: this.contentLength
    }
  }
}

/** @internal */
export const stream = (
  body: Stream_.Stream<Uint8Array, unknown>,
  contentType?: string | undefined,
  contentLength?: number | undefined
): Body.Stream => new StreamImpl(body, contentType ?? "application/octet-stream", contentLength)
