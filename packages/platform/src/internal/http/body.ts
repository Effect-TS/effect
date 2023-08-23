import * as Effect from "@effect/io/Effect"
import type * as PlatformError from "@effect/platform/Error"
import * as FileSystem from "@effect/platform/FileSystem"
import type * as Body from "@effect/platform/Http/Body"
import * as Schema from "@effect/schema/Schema"
import type * as Stream_ from "@effect/stream/Stream"
import * as Mime from "mime"

/** @internal */
export const TypeId: Body.TypeId = Symbol.for(
  "@effect/platform/Http/Body"
) as Body.TypeId

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

/** @internal */
export const text = (body: string, contentType?: string): Body.Uint8Array =>
  uint8Array(new TextEncoder().encode(body), contentType ?? "text/plain")

class EffectBodyImpl implements Body.EffectBody {
  readonly [TypeId]: Body.TypeId
  readonly _tag = "Effect"
  constructor(
    readonly effect: Effect.Effect<never, unknown, Body.NonEffect>,
    readonly contentType?: string
  ) {
    this[TypeId] = TypeId
  }
}

/** @internal */
export const effect = (
  body: Effect.Effect<never, unknown, Body.NonEffect>
): Body.EffectBody => new EffectBodyImpl(body)

/** @internal */
export const unsafeJson = (body: unknown): Body.Uint8Array =>
  uint8Array(new TextEncoder().encode(JSON.stringify(body)), "application/json")

/** @internal */
export const json = (body: unknown): Body.EffectBody => effect(Effect.try(() => unsafeJson(body)))

/** @internal */
export const jsonSchema = <I, A>(schema: Schema.Schema<I, A>) => {
  const encode = Schema.encode(schema)
  return (body: A): Body.EffectBody =>
    effect(Effect.flatMap(
      encode(body),
      (json) => Effect.try(() => unsafeJson(json))
    ))
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
          options?.contentType ?? Mime.getType(path) ?? undefined,
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
        options?.contentType ?? Mime.getType(path) ?? undefined,
        Number(info.size)
      )
  )

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
