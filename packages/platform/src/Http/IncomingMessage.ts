/**
 * @since 1.0.0
 */
import type { ParseOptions } from "@effect/schema/AST"
import * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { dual, flow } from "effect/Function"
import * as Global from "effect/GlobalValue"
import type { Inspectable } from "effect/Inspectable"
import * as Option from "effect/Option"
import type * as Stream from "effect/Stream"
import * as Tracer from "effect/Tracer"
import type { ExternalSpan } from "effect/Tracer"
import * as FileSystem from "../FileSystem.js"
import type * as Headers from "./Headers.js"
import type * as UrlParams from "./UrlParams.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = Symbol.for("@effect/platform/Http/IncomingMessage")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface IncomingMessage<E> extends Inspectable {
  readonly [TypeId]: TypeId
  readonly headers: Headers.Headers
  readonly remoteAddress: Option.Option<string>
  readonly json: Effect.Effect<unknown, E>
  readonly text: Effect.Effect<string, E>
  readonly urlParamsBody: Effect.Effect<UrlParams.UrlParams, E>
  readonly arrayBuffer: Effect.Effect<ArrayBuffer, E>
  readonly stream: Stream.Stream<Uint8Array, E>
}

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyJson = <A, I, R>(schema: Schema.Schema<A, I, R>, options?: ParseOptions | undefined) => {
  const parse = Schema.decodeUnknown(schema, options)
  return <E>(self: IncomingMessage<E>): Effect.Effect<A, E | ParseResult.ParseError, R> =>
    Effect.flatMap(self.json, parse)
}

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyJsonEffect = <A, I, R>(schema: Schema.Schema<A, I, R>, options?: ParseOptions | undefined) => {
  const decode = schemaBodyJson(schema, options)
  return <E, E2, R2>(effect: Effect.Effect<IncomingMessage<E>, E2, R2>) => Effect.scoped(Effect.flatMap(effect, decode))
}

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyUrlParams = <R, I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const parse = Schema.decodeUnknown(schema, options)
  return <E>(self: IncomingMessage<E>): Effect.Effect<A, E | ParseResult.ParseError, R> =>
    Effect.flatMap(self.urlParamsBody, (_) => parse(Object.fromEntries(_)))
}

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyUrlParamsEffect = <R, I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const decode = schemaBodyUrlParams(schema, options)
  return <E, E2, R2>(effect: Effect.Effect<IncomingMessage<E>, E2, R2>) => Effect.scoped(Effect.flatMap(effect, decode))
}

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaHeaders = <R, I extends Readonly<Record<string, string | undefined>>, A>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const parse = Schema.decodeUnknown(schema, options)
  return <E>(self: IncomingMessage<E>): Effect.Effect<A, ParseResult.ParseError, R> => parse(self.headers)
}

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaHeadersEffect = <R, I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<A, I, R>,
  options?: ParseOptions | undefined
) => {
  const decode = schemaHeaders(schema, options)
  return <E, E2, R2>(effect: Effect.Effect<IncomingMessage<E>, E2, R2>) => Effect.scoped(Effect.flatMap(effect, decode))
}

const SpanSchema = Schema.struct({
  traceId: Schema.string,
  spanId: Schema.string,
  parentSpanId: Schema.union(Schema.string, Schema.undefined),
  sampled: Schema.boolean
})

const W3CTC_FLAG_SAMPLED = 0b00000001

const W3CTraceParent = Schema.union(
  Schema.transform(
    Schema.NonEmpty,
    Schema.struct({
      version: Schema.string.pipe(Schema.length(2), Schema.compose(Schema.literal("00"), { strict: false })),
      versionFormat: Schema.transform(
        Schema.split("-").pipe(
          Schema.compose(
            Schema.tuple(
              Schema.string,
              Schema.string,
              Schema.string.pipe(Schema.length(2), Schema.compose(Schema.NumberFromHex))
            ),
            { strict: false }
          )
        ),
        Schema.struct({
          traceId: Schema.string,
          parentId: Schema.string,
          traceFlags: Schema.struct({
            sampled: Schema.boolean
          })
        }),
        ([traceId, parentId, traceFlags]) => ({
          traceId,
          parentId,
          traceFlags: {
            sampled: (traceFlags & W3CTC_FLAG_SAMPLED) === W3CTC_FLAG_SAMPLED
          }
        }),
        (_) => [_.traceId, _.parentId, _.traceFlags.sampled ? W3CTC_FLAG_SAMPLED : 0] as const
      )
    }),
    (_) => {
      const [version, versionFormat] = _.split(/-(.+)/s)

      return {
        version,
        versionFormat
      }
    },
    (_) => `${_.version}-${_.versionFormat}`
  )
)

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaExternalSpan: <E>(
  self: IncomingMessage<E>
) => Effect.Effect<Tracer.ExternalSpan, ParseResult.ParseError> = flow(
  schemaHeaders(Schema.union(
    Schema.transformOrFail(
      Schema.struct({
        b3: Schema.NonEmpty
      }),
      SpanSchema,
      (input, _, ast) => {
        const parts = input.b3.split("-")
        if (parts.length >= 2) {
          return ParseResult.succeed(
            {
              traceId: parts[0],
              spanId: parts[1],
              sampled: parts[2] ? parts[2] === "1" : true,
              parentSpanId: parts[3]
            } as const
          )
        }
        return ParseResult.fail(new ParseResult.Type(ast, input))
      },
      (_) => ParseResult.succeed({ b3: "" } as const)
    ),
    Schema.transform(
      Schema.struct({
        "x-b3-traceid": Schema.NonEmpty,
        "x-b3-spanid": Schema.NonEmpty,
        "x-b3-parentspanid": Schema.optional(Schema.NonEmpty),
        "x-b3-sampled": Schema.optional(Schema.NonEmpty, { default: () => "1" })
      }),
      SpanSchema,
      (_) => ({
        traceId: _["x-b3-traceid"],
        spanId: _["x-b3-spanid"],
        parentSpanId: _["x-b3-parentspanid"],
        sampled: _["x-b3-sampled"] === "1"
      } as const),
      (_) => ({
        "x-b3-traceid": _.traceId,
        "x-b3-spanid": _.spanId,
        "x-b3-parentspanid": _.parentSpanId,
        "x-b3-sampled": _.sampled ? "1" : "0"
      } as const)
    ),
    Schema.transform(
      Schema.struct({
        traceparent: W3CTraceParent
      }),
      SpanSchema,
      ({ traceparent }) => {
        switch (traceparent.version) {
          case "00":
            return {
              traceId: traceparent.versionFormat.traceId,
              spanId: traceparent.versionFormat.parentId,
              parentSpanId: undefined,
              sampled: traceparent.versionFormat.traceFlags.sampled
            }
        }
      },
      (_) => ({
        traceparent: {
          version: "00",
          versionFormat: {
            traceId: _.traceId,
            parentId: _.spanId,
            traceFlags: {
              sampled: _.sampled
            }
          }
        } as const
      })
    )
  )),
  Effect.map((_): ExternalSpan =>
    Tracer.externalSpan({
      traceId: _.traceId,
      spanId: _.spanId,
      sampled: _.sampled
    })
  )
)

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const maxBodySize: FiberRef.FiberRef<Option.Option<FileSystem.Size>> = Global.globalValue(
  "@effect/platform/Http/ImcomingMessage/maxBodySize",
  () => FiberRef.unsafeMake(Option.none<FileSystem.Size>())
)

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withMaxBodySize = dual<
  (size: Option.Option<FileSystem.SizeInput>) => <R, E, A>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  <R, E, A>(effect: Effect.Effect<A, E, R>, size: Option.Option<FileSystem.SizeInput>) => Effect.Effect<A, E, R>
>(2, (effect, size) => Effect.locally(effect, maxBodySize, Option.map(size, FileSystem.Size)))

/**
 * @since 1.0.0
 */
export const inspect = <E>(self: IncomingMessage<E>, that: object): object => {
  const contentType = self.headers["content-type"] ?? ""
  let body: unknown
  if (contentType.includes("application/json")) {
    try {
      body = Effect.runSync(self.json)
    } catch (_) {
      //
    }
  } else if (contentType.includes("text/") || contentType.includes("urlencoded")) {
    try {
      body = Effect.runSync(self.text)
    } catch (_) {
      //
    }
  }
  const obj: any = {
    ...that,
    headers: self.headers,
    remoteAddress: self.remoteAddress.toJSON()
  }
  if (body !== undefined) {
    obj.body = body
  }
  return obj
}
