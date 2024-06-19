/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import type { Inspectable } from "effect/Inspectable"
import type * as App from "./HttpApp.js"
import type * as Error from "./HttpServerError.js"
import type * as ServerRequest from "./HttpServerRequest.js"
import * as internal from "./internal/httpMultiplex.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface HttpMultiplex<E = never, R = never> extends App.Default<E | Error.RouteNotFound, R>, Inspectable {
  readonly [TypeId]: TypeId
  readonly apps: ReadonlyArray<
    readonly [
      predicate: (request: ServerRequest.HttpServerRequest) => Effect.Effect<boolean, E, R>,
      app: App.Default<E, R>
    ]
  >
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: HttpMultiplex<never> = internal.empty

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: <E, R>(
  apps: Iterable<
    readonly [
      predicate: (request: ServerRequest.HttpServerRequest) => Effect.Effect<boolean, E, R>,
      app: App.Default<E, R>
    ]
  >
) => HttpMultiplex<E, R> = internal.make

/**
 * @since 1.0.0
 * @category combinators
 */
export const add: {
  <E2, R2, E3, R3>(
    predicate: (request: ServerRequest.HttpServerRequest) => Effect.Effect<boolean, E2, R2>,
    app: App.Default<E3, R3>
  ): <E, R>(self: HttpMultiplex<E, R>) => HttpMultiplex<E2 | E3 | E, R2 | R3 | R>
  <E, R, E2, R2, E3, R3>(
    self: HttpMultiplex<E, R>,
    predicate: (request: ServerRequest.HttpServerRequest) => Effect.Effect<boolean, E2, R2>,
    app: App.Default<E3, R3>
  ): HttpMultiplex<E | E2 | E3, R | R2 | R3>
} = internal.add

/**
 * @since 1.0.0
 * @category combinators
 */
export const headerExact: {
  <E2, R2>(
    header: string,
    value: string,
    app: App.Default<E2, R2>
  ): <E, R>(self: HttpMultiplex<E, R>) => HttpMultiplex<E2 | E, R2 | R>
  <E, R, E2, R2>(
    self: HttpMultiplex<E, R>,
    header: string,
    value: string,
    app: App.Default<E2, R2>
  ): HttpMultiplex<E | E2, R | R2>
} = internal.headerExact

/**
 * @since 1.0.0
 * @category combinators
 */
export const headerRegex: {
  <E2, R2>(
    header: string,
    regex: RegExp,
    app: App.Default<E2, R2>
  ): <E, R>(self: HttpMultiplex<E, R>) => HttpMultiplex<E2 | E, R2 | R>
  <E, R, E2, R2>(
    self: HttpMultiplex<E, R>,
    header: string,
    regex: RegExp,
    app: App.Default<E2, R2>
  ): HttpMultiplex<E | E2, R | R2>
} = internal.headerRegex

/**
 * @since 1.0.0
 * @category combinators
 */
export const headerStartsWith: {
  <E2, R2>(
    header: string,
    prefix: string,
    app: App.Default<E2, R2>
  ): <E, R>(self: HttpMultiplex<E, R>) => HttpMultiplex<E2 | E, R2 | R>
  <E, R, E2, R2>(
    self: HttpMultiplex<E, R>,
    header: string,
    prefix: string,
    app: App.Default<E2, R2>
  ): HttpMultiplex<E | E2, R | R2>
} = internal.headerStartsWith

/**
 * @since 1.0.0
 * @category combinators
 */
export const headerEndsWith: {
  <E2, R2>(
    header: string,
    suffix: string,
    app: App.Default<E2, R2>
  ): <E, R>(self: HttpMultiplex<E, R>) => HttpMultiplex<E2 | E, R2 | R>
  <E, R, E2, R2>(
    self: HttpMultiplex<E, R>,
    header: string,
    suffix: string,
    app: App.Default<E2, R2>
  ): HttpMultiplex<E | E2, R | R2>
} = internal.headerEndsWith

/**
 * @since 1.0.0
 * @category combinators
 */
export const hostExact: {
  <E2, R2>(host: string, app: App.Default<E2, R2>): <E, R>(self: HttpMultiplex<E, R>) => HttpMultiplex<E2 | E, R2 | R>
  <E, R, E2, R2>(self: HttpMultiplex<E, R>, host: string, app: App.Default<E2, R2>): HttpMultiplex<E | E2, R | R2>
} = internal.hostExact

/**
 * @since 1.0.0
 * @category combinators
 */
export const hostRegex: {
  <E2, R2>(regex: RegExp, app: App.Default<E2, R2>): <E, R>(self: HttpMultiplex<E, R>) => HttpMultiplex<E2 | E, R2 | R>
  <E, R, E2, R2>(self: HttpMultiplex<E, R>, regex: RegExp, app: App.Default<E2, R2>): HttpMultiplex<E | E2, R | R2>
} = internal.hostRegex

/**
 * @since 1.0.0
 * @category combinators
 */
export const hostStartsWith: {
  <E2, R2>(prefix: string, app: App.Default<E2, R2>): <E, R>(self: HttpMultiplex<E, R>) => HttpMultiplex<E2 | E, R2 | R>
  <E, R, E2, R2>(self: HttpMultiplex<E, R>, prefix: string, app: App.Default<E2, R2>): HttpMultiplex<E | E2, R | R2>
} = internal.hostStartsWith

/**
 * @since 1.0.0
 * @category combinators
 */
export const hostEndsWith: {
  <E2, R2>(suffix: string, app: App.Default<E2, R2>): <E, R>(self: HttpMultiplex<E, R>) => HttpMultiplex<E2 | E, R2 | R>
  <E, R, E2, R2>(self: HttpMultiplex<E, R>, suffix: string, app: App.Default<E2, R2>): HttpMultiplex<E | E2, R | R2>
} = internal.hostEndsWith
