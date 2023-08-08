import * as Effect from "@effect/io/Effect"
import type * as Body from "@effect/platform/Http/Body"
import * as Schema from "@effect/schema/Schema"
import type * as Stream_ from "@effect/stream/Stream"

/** @internal */
export const TypeId: Body.TypeId = Symbol.for(
  "@effect/platform/Http/Body"
) as Body.TypeId

class EmptyImpl implements Body.Empty {
  readonly [TypeId]: Body.TypeId = TypeId
  readonly _tag = "Empty"
}

/** @internal */
export const empty: Body.Empty = new EmptyImpl()

class RawImpl implements Body.Raw {
  readonly [TypeId]: Body.TypeId = TypeId
  readonly _tag = "Raw"
  constructor(
    readonly body: unknown,
    readonly contentType?: string,
    readonly contentLength?: number
  ) {}
}

/** @internal */
export const raw = (body: unknown, contentType?: string, contentLength?: number): Body.Raw =>
  new RawImpl(body, contentType, contentLength)

class BytesImpl implements Body.Bytes {
  readonly [TypeId]: Body.TypeId = TypeId
  readonly _tag = "Bytes"
  constructor(
    readonly body: Uint8Array,
    readonly contentType?: string
  ) {}
  get contentLength(): number {
    return this.body.length
  }
}

/** @internal */
export const bytes = (body: Uint8Array, contentType?: string): Body.Bytes => new BytesImpl(body, contentType)

/** @internal */
export const text = (body: string, contentType?: string): Body.Bytes =>
  bytes(new TextEncoder().encode(body), contentType)

class BytesEffectImpl implements Body.BytesEffect {
  readonly [TypeId]: Body.TypeId = TypeId
  readonly _tag = "BytesEffect"
  constructor(
    readonly body: Effect.Effect<never, unknown, Uint8Array>,
    readonly contentType?: string
  ) {}
}

/** @internal */
export const bytesEffect = (
  body: Effect.Effect<never, unknown, Uint8Array>,
  contentType?: string
): Body.BytesEffect => new BytesEffectImpl(body, contentType)

/** @internal */
export const json = (body: unknown): Body.BytesEffect =>
  bytesEffect(
    Effect.try(() => new TextEncoder().encode(JSON.stringify(body))),
    "application/json"
  )

/** @internal */
export const jsonSchema = <I, A>(schema: Schema.Schema<I, A>) => {
  const encode = Schema.encode(schema)
  return (body: A): Body.BytesEffect =>
    bytesEffect(
      Effect.flatMap(
        encode(body),
        (json) => Effect.try(() => new TextEncoder().encode(JSON.stringify(json)))
      ),
      "application/json"
    )
}

class FormDataImpl implements Body.FormData {
  readonly [TypeId]: Body.TypeId = TypeId
  readonly _tag = "FormData"
  constructor(
    readonly formData: FormData
  ) {}
}

/** @internal */
export const formData = (body: FormData): Body.FormData => new FormDataImpl(body)

class StreamImpl implements Body.Stream {
  readonly [TypeId]: Body.TypeId = TypeId
  readonly _tag = "Stream"
  constructor(
    readonly stream: Stream_.Stream<never, unknown, Uint8Array>,
    readonly contentType?: string,
    readonly contentLength?: number
  ) {}
}

/** @internal */
export const stream = (
  body: Stream_.Stream<never, unknown, Uint8Array>,
  contentType?: string,
  contentLength?: number
): Body.Stream => new StreamImpl(body, contentType, contentLength)
