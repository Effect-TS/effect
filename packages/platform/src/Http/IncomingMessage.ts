/**
 * @since 1.0.0
 */
import * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { dual, flow } from "effect/Function"
import * as Global from "effect/GlobalValue"
import * as Option from "effect/Option"
import type * as Stream from "effect/Stream"
import type { ExternalSpan } from "effect/Tracer"
import * as FileSystem from "../FileSystem"
import type * as Headers from "./Headers"
import type * as UrlParams from "./UrlParams"

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
  readonly json: Effect.Effect<never, E, unknown>
  readonly text: Effect.Effect<never, E, string>
  readonly urlParamsBody: Effect.Effect<never, E, UrlParams.UrlParams>
  readonly arrayBuffer: Effect.Effect<never, E, ArrayBuffer>
  readonly stream: Stream.Stream<never, E, Uint8Array>
}

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyJson = <I, A>(schema: Schema.Schema<I, A>) => {
  const parse = Schema.parse(schema)
  return <E>(self: IncomingMessage<E>): Effect.Effect<never, E | ParseResult.ParseError, A> =>
    Effect.flatMap(self.json, parse)
}

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaBodyUrlParams = <I extends Readonly<Record<string, string>>, A>(schema: Schema.Schema<I, A>) => {
  const parse = Schema.parse(schema)
  return <E>(self: IncomingMessage<E>): Effect.Effect<never, E | ParseResult.ParseError, A> =>
    Effect.flatMap(self.urlParamsBody, (_) => parse(Object.fromEntries(_)))
}

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaHeaders = <I extends Readonly<Record<string, string>>, A>(schema: Schema.Schema<I, A>) => {
  const parse = Schema.parse(schema)
  return <E>(self: IncomingMessage<E>): Effect.Effect<never, ParseResult.ParseError, A> => parse(self.headers)
}

const SpanSchema = Schema.struct({
  traceId: Schema.string,
  spanId: Schema.string,
  parentSpanId: Schema.union(Schema.string, Schema.undefined)
})

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaExternalSpan = flow(
  schemaHeaders(Schema.union(
    Schema.transformOrFail(
      Schema.struct({
        b3: Schema.NonEmpty
      }),
      SpanSchema,
      (_) => {
        const parts = _.b3.split("-")
        if (parts.length >= 2) {
          return ParseResult.success({
            traceId: parts[0],
            spanId: parts[1],
            parentSpanId: parts[3]
          })
        }
        return ParseResult.failure(ParseResult.missing)
      },
      (_) => ParseResult.success("")
    ),
    Schema.transform(
      Schema.struct({
        "x-b3-traceid": Schema.NonEmpty,
        "x-b3-spanid": Schema.NonEmpty,
        "x-b3-parentspanid": Schema.optional(Schema.NonEmpty)
      }),
      SpanSchema,
      (_) => ({
        traceId: _["x-b3-traceid"],
        spanId: _["x-b3-spanid"],
        parentSpanId: _["x-b3-parentspanid"]
      }),
      (_) => ({
        "x-b3-traceid": _.traceId,
        "x-b3-spanid": _.spanId,
        "x-b3-parentspanid": _.parentSpanId
      })
    )
  )),
  Effect.map((_): ExternalSpan => ({
    _tag: "ExternalSpan",
    traceId: _.traceId,
    spanId: _.spanId,
    context: Context.empty()
  }))
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
  (size: Option.Option<FileSystem.SizeInput>) => <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>,
  <R, E, A>(effect: Effect.Effect<R, E, A>, size: Option.Option<FileSystem.SizeInput>) => Effect.Effect<R, E, A>
>(2, (effect, size) => Effect.locally(effect, maxBodySize, Option.map(size, FileSystem.Size)))
