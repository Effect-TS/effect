/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import type * as FiberRef from "effect/FiberRef"
import type * as Predicate from "effect/Predicate"
import * as internal from "../internal/http/middleware.js"
import type * as App from "./App.js"
import type * as ServerRequest from "./ServerRequest.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface Middleware {
  <R, E>(self: App.Default<E, R>): App.Default<any, any>
}

/**
 * @since 1.0.0
 */
export declare namespace Middleware {
  /**
   * @since 1.0.0
   */
  export interface Applied<A extends App.Default<any, any>, E, R> {
    (self: App.Default<E, R>): A
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: <M extends Middleware>(middleware: M) => M = internal.make

/**
 * @since 1.0.0
 * @category constructors
 */
export const logger: <R, E>(httpApp: App.Default<E, R>) => App.Default<E, R> = internal.logger

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const loggerDisabled: FiberRef.FiberRef<boolean> = internal.loggerDisabled

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withLoggerDisabled: <R, E, A>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R> =
  internal.withLoggerDisabled

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const currentTracerDisabledWhen: FiberRef.FiberRef<Predicate.Predicate<ServerRequest.ServerRequest>> =
  internal.currentTracerDisabledWhen

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withTracerDisabledWhen: {
  (
    predicate: Predicate.Predicate<ServerRequest.ServerRequest>
  ): <R, E, A>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <R, E, A>(
    effect: Effect.Effect<A, E, R>,
    predicate: Predicate.Predicate<ServerRequest.ServerRequest>
  ): Effect.Effect<A, E, R>
} = internal.withTracerDisabledWhen

/**
 * @since 1.0.0
 * @category constructors
 */
export const xForwardedHeaders: <R, E>(httpApp: App.Default<E, R>) => App.Default<E, R> = internal.xForwardedHeaders
