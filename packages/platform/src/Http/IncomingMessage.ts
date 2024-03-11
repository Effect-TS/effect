/**
 * @since 1.0.0
 */
import * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { dual, flow } from "effect/Function"
import * as Global from "effect/GlobalValue"
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
export interface IncomingMessage<E> {
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
export const schemaBodyJson = <A, I, R>(schema: Schema.Schema<A, I, R>) => {
  const parse = Schema.decodeUnknown(schema)
  return <E>(self: IncomingMessage<E>): Effect.Effect<A, E | ParseResult.ParseError, R> =>
    Effect.flatMap(self.json, parse)
}

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyJsonEffect = <A, I, R>(schema: Schema.Schema<A, I, R>) => {
  const decode = schemaBodyJson(schema)
  return <E, E2, R2>(effect: Effect.Effect<IncomingMessage<E>, E2, R2>) => Effect.scoped(Effect.flatMap(effect, decode))
}

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyUrlParams = <R, I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<A, I, R>
) => {
  const parse = Schema.decodeUnknown(schema)
  return <E>(self: IncomingMessage<E>): Effect.Effect<A, E | ParseResult.ParseError, R> =>
    Effect.flatMap(self.urlParamsBody, (_) => parse(Object.fromEntries(_)))
}

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyUrlParamsEffect = <R, I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<A, I, R>
) => {
  const decode = schemaBodyUrlParams(schema)
  return <E, E2, R2>(effect: Effect.Effect<IncomingMessage<E>, E2, R2>) => Effect.scoped(Effect.flatMap(effect, decode))
}

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaHeaders = <R, I extends Readonly<Record<string, string>>, A>(schema: Schema.Schema<A, I, R>) => {
  const parse = Schema.decodeUnknown(schema)
  return <E>(self: IncomingMessage<E>): Effect.Effect<A, ParseResult.ParseError, R> => parse(self.headers)
}

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaHeadersEffect = <R, I extends Readonly<Record<string, string>>, A>(
  schema: Schema.Schema<A, I, R>
) => {
  const decode = schemaHeaders(schema)
  return <E, E2, R2>(effect: Effect.Effect<IncomingMessage<E>, E2, R2>) => Effect.scoped(Effect.flatMap(effect, decode))
}

const SpanSchema = Schema.struct({
  traceId: Schema.string,
  spanId: Schema.string,
  parentSpanId: Schema.union(Schema.string, Schema.undefined),
  sampled: Schema.boolean
})

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
