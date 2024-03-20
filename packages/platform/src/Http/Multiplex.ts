/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import type { Inspectable } from "effect/Inspectable"
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
export interface Multiplex<E = never, R = never> extends App.Default<E | Error.RouteNotFound, R>, Inspectable {
  readonly [TypeId]: TypeId
  readonly apps: ReadonlyArray<
    readonly [
      predicate: (request: ServerRequest.ServerRequest) => Effect.Effect<boolean, E, R>,
      app: App.Default<E, R>
    ]
  >
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: Multiplex<never> = internal.empty

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: <R, E>(
  apps: Iterable<
    readonly [predicate: (request: ServerRequest.ServerRequest) => Effect.Effect<boolean, E, R>, app: App.Default<E, R>]
  >
) => Multiplex<E, R> = internal.make

/**
 * @since 1.0.0
 * @category combinators
 */
export const add: {
  <R2, E2, R3, E3>(
    predicate: (request: ServerRequest.ServerRequest) => Effect.Effect<boolean, E2, R2>,
    app: App.Default<E3, R3>
  ): <R, E>(self: Multiplex<E, R>) => Multiplex<E2 | E3 | E, R2 | R3 | R>
  <R, E, R2, E2, R3, E3>(
    self: Multiplex<E, R>,
    predicate: (request: ServerRequest.ServerRequest) => Effect.Effect<boolean, E2, R2>,
    app: App.Default<E3, R3>
  ): Multiplex<E | E2 | E3, R | R2 | R3>
} = internal.add

/**
 * @since 1.0.0
 * @category combinators
 */
export const headerExact: {
  <R2, E2>(
    header: string,
    value: string,
    app: App.Default<E2, R2>
  ): <R, E>(self: Multiplex<E, R>) => Multiplex<E2 | E, R2 | R>
  <R, E, R2, E2>(
    self: Multiplex<E, R>,
    header: string,
    value: string,
    app: App.Default<E2, R2>
  ): Multiplex<E | E2, R | R2>
} = internal.headerExact

/**
 * @since 1.0.0
 * @category combinators
 */
export const headerRegex: {
  <R2, E2>(
    header: string,
    regex: RegExp,
    app: App.Default<E2, R2>
  ): <R, E>(self: Multiplex<E, R>) => Multiplex<E2 | E, R2 | R>
  <R, E, R2, E2>(
    self: Multiplex<E, R>,
    header: string,
    regex: RegExp,
    app: App.Default<E2, R2>
  ): Multiplex<E | E2, R | R2>
} = internal.headerRegex

/**
 * @since 1.0.0
 * @category combinators
 */
export const headerStartsWith: {
  <R2, E2>(
    header: string,
    prefix: string,
    app: App.Default<E2, R2>
  ): <R, E>(self: Multiplex<E, R>) => Multiplex<E2 | E, R2 | R>
  <R, E, R2, E2>(
    self: Multiplex<E, R>,
    header: string,
    prefix: string,
    app: App.Default<E2, R2>
  ): Multiplex<E | E2, R | R2>
} = internal.headerStartsWith

/**
 * @since 1.0.0
 * @category combinators
 */
export const headerEndsWith: {
  <R2, E2>(
    header: string,
    suffix: string,
    app: App.Default<E2, R2>
  ): <R, E>(self: Multiplex<E, R>) => Multiplex<E2 | E, R2 | R>
  <R, E, R2, E2>(
    self: Multiplex<E, R>,
    header: string,
    suffix: string,
    app: App.Default<E2, R2>
  ): Multiplex<E | E2, R | R2>
} = internal.headerEndsWith

/**
 * @since 1.0.0
 * @category combinators
 */
export const hostExact: {
  <R2, E2>(host: string, app: App.Default<E2, R2>): <R, E>(self: Multiplex<E, R>) => Multiplex<E2 | E, R2 | R>
  <R, E, R2, E2>(self: Multiplex<E, R>, host: string, app: App.Default<E2, R2>): Multiplex<E | E2, R | R2>
} = internal.hostExact

/**
 * @since 1.0.0
 * @category combinators
 */
export const hostRegex: {
  <R2, E2>(regex: RegExp, app: App.Default<E2, R2>): <R, E>(self: Multiplex<E, R>) => Multiplex<E2 | E, R2 | R>
  <R, E, R2, E2>(self: Multiplex<E, R>, regex: RegExp, app: App.Default<E2, R2>): Multiplex<E | E2, R | R2>
} = internal.hostRegex

/**
 * @since 1.0.0
 * @category combinators
 */
export const hostStartsWith: {
  <R2, E2>(prefix: string, app: App.Default<E2, R2>): <R, E>(self: Multiplex<E, R>) => Multiplex<E2 | E, R2 | R>
  <R, E, R2, E2>(self: Multiplex<E, R>, prefix: string, app: App.Default<E2, R2>): Multiplex<E | E2, R | R2>
} = internal.hostStartsWith

/**
 * @since 1.0.0
 * @category combinators
 */
export const hostEndsWith: {
  <R2, E2>(suffix: string, app: App.Default<E2, R2>): <R, E>(self: Multiplex<E, R>) => Multiplex<E2 | E, R2 | R>
  <R, E, R2, E2>(self: Multiplex<E, R>, suffix: string, app: App.Default<E2, R2>): Multiplex<E | E2, R | R2>
} = internal.hostEndsWith
