/**
 * @since 1.0.0
 */
import type { ParseOptions } from "@effect/schema/AST"
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { dual } from "effect/Function"
import * as Global from "effect/GlobalValue"
import type { Inspectable } from "effect/Inspectable"
import * as Option from "effect/Option"
import type * as Stream from "effect/Stream"
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
