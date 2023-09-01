/**
 * @since 1.0.0
 */
import { dual } from "@effect/data/Function"
import * as Global from "@effect/data/GlobalValue"
import * as Option from "@effect/data/Option"
import * as Effect from "@effect/io/Effect"
import * as FiberRef from "@effect/io/FiberRef"
import * as FileSystem from "@effect/platform/FileSystem"
import type * as Headers from "@effect/platform/Http/Headers"
import type * as UrlParams from "@effect/platform/Http/UrlParams"
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import type * as Stream from "@effect/stream/Stream"

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
