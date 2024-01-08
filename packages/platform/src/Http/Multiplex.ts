/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import * as internal from "../internal/http/multiplex.js"
import type * as App from "./App.js"
import type * as Error from "./ServerError.js"
import type * as ServerRequest from "./ServerRequest.js"

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
export interface Multiplex<R, E> extends App.Default<R, E | Error.RouteNotFound> {
  readonly [TypeId]: TypeId
  readonly apps: ReadonlyArray<
    readonly [
      predicate: (request: ServerRequest.ServerRequest) => Effect.Effect<R, E, boolean>,
      app: App.Default<R, E>
    ]
  >
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: Multiplex<never, never> = internal.empty

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: <R, E>(
  apps: Iterable<
    readonly [predicate: (request: ServerRequest.ServerRequest) => Effect.Effect<R, E, boolean>, app: App.Default<R, E>]
  >
) => Multiplex<R, E> = internal.make

/**
 * @since 1.0.0
 * @category combinators
 */
export const add: {
  <R2, E2, R3, E3>(
    predicate: (request: ServerRequest.ServerRequest) => Effect.Effect<R2, E2, boolean>,
    app: App.Default<R3, E3>
  ): <R, E>(self: Multiplex<R, E>) => Multiplex<R2 | R3 | R, E2 | E3 | E>
  <R, E, R2, E2, R3, E3>(
    self: Multiplex<R, E>,
    predicate: (request: ServerRequest.ServerRequest) => Effect.Effect<R2, E2, boolean>,
    app: App.Default<R3, E3>
  ): Multiplex<R | R2 | R3, E | E2 | E3>
} = internal.add

/**
 * @since 1.0.0
 * @category combinators
 */
export const headerExact: {
  <R2, E2>(
    header: string,
    value: string,
    app: App.Default<R2, E2>
  ): <R, E>(self: Multiplex<R, E>) => Multiplex<R2 | R, E2 | E>
  <R, E, R2, E2>(
    self: Multiplex<R, E>,
    header: string,
    value: string,
    app: App.Default<R2, E2>
  ): Multiplex<R | R2, E | E2>
} = internal.headerExact

/**
 * @since 1.0.0
 * @category combinators
 */
export const headerRegex: {
  <R2, E2>(
    header: string,
    regex: RegExp,
    app: App.Default<R2, E2>
  ): <R, E>(self: Multiplex<R, E>) => Multiplex<R2 | R, E2 | E>
  <R, E, R2, E2>(
    self: Multiplex<R, E>,
    header: string,
    regex: RegExp,
    app: App.Default<R2, E2>
  ): Multiplex<R | R2, E | E2>
} = internal.headerRegex

/**
 * @since 1.0.0
 * @category combinators
 */
export const headerStartsWith: {
  <R2, E2>(
    header: string,
    prefix: string,
    app: App.Default<R2, E2>
  ): <R, E>(self: Multiplex<R, E>) => Multiplex<R2 | R, E2 | E>
  <R, E, R2, E2>(
    self: Multiplex<R, E>,
    header: string,
    prefix: string,
    app: App.Default<R2, E2>
  ): Multiplex<R | R2, E | E2>
} = internal.headerStartsWith

/**
 * @since 1.0.0
 * @category combinators
 */
export const hostExact: {
  <R2, E2>(host: string, app: App.Default<R2, E2>): <R, E>(self: Multiplex<R, E>) => Multiplex<R2 | R, E2 | E>
  <R, E, R2, E2>(self: Multiplex<R, E>, host: string, app: App.Default<R2, E2>): Multiplex<R | R2, E | E2>
} = internal.hostExact

/**
 * @since 1.0.0
 * @category combinators
 */
export const hostRegex: {
  <R2, E2>(regex: RegExp, app: App.Default<R2, E2>): <R, E>(self: Multiplex<R, E>) => Multiplex<R2 | R, E2 | E>
  <R, E, R2, E2>(self: Multiplex<R, E>, regex: RegExp, app: App.Default<R2, E2>): Multiplex<R | R2, E | E2>
} = internal.hostRegex

/**
 * @since 1.0.0
 * @category combinators
 */
export const hostStartsWith: {
  <R2, E2>(prefix: string, app: App.Default<R2, E2>): <R, E>(self: Multiplex<R, E>) => Multiplex<R2 | R, E2 | E>
  <R, E, R2, E2>(self: Multiplex<R, E>, prefix: string, app: App.Default<R2, E2>): Multiplex<R | R2, E | E2>
} = internal.hostStartsWith
