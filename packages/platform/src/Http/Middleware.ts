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
  <R, E>(self: App.Default<R, E>): App.Default<any, any>
}

/**
 * @since 1.0.0
 */
export declare namespace Middleware {
  /**
   * @since 1.0.0
   */
  export interface Applied<R, E, A extends App.Default<any, any>> {
    (self: App.Default<R, E>): A
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
export const logger: <R, E>(httpApp: App.Default<R, E>) => App.Default<R, E> = internal.logger

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const loggerDisabled: FiberRef.FiberRef<boolean> = internal.loggerDisabled

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withLoggerDisabled: <R, E, A>(self: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A> =
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
  ): <R, E, A>(effect: Effect.Effect<R, E, A>) => Effect.Effect<R, E, A>
  <R, E, A>(
    effect: Effect.Effect<R, E, A>,
    predicate: Predicate.Predicate<ServerRequest.ServerRequest>
  ): Effect.Effect<R, E, A>
} = internal.withTracerDisabledWhen

/**
 * @since 1.0.0
 * @category constructors
 */
export const xForwardedHeaders: <R, E>(httpApp: App.Default<R, E>) => App.Default<R, E> = internal.xForwardedHeaders
