/**
 * @since 1.0.0
 */
import type * as App from "@effect/platform/Http/App"
import * as internal from "@effect/platform/internal/http/middleware"

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
export namespace Middleware {
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
 * @category combinators
 */
export const compose: {
  <B extends App.Default<any, any>, C extends App.Default<any, any>>(
    that: (b: B) => C
  ): <A extends App.Default<any, any>>(self: (a: A) => B) => (a: A) => C
  <A extends App.Default<any, any>, B extends App.Default<any, any>, C extends App.Default<any, any>>(
    self: (a: A) => B,
    that: (b: B) => C
  ): (a: A) => C
} = internal.compose

/**
 * @since 1.0.0
 * @category constructors
 */
export const logger: <R, E>(httpApp: App.Default<R, E>) => App.Default<R, E> = internal.logger

/**
 * @since 1.0.0
 * @category constructors
 */
export const tracer: <R, E>(httpApp: App.Default<R, E>) => App.Default<R, E> = internal.tracer

/**
 * @since 1.0.0
 * @category constructors
 */
export const loggerTracer: <R, E>(httpApp: App.Default<R, E>) => App.Default<R, E> = internal.loggerTracer

/**
 * @since 1.0.0
 * @category constructors
 */
export const xForwardedHeaders: <R, E>(httpApp: App.Default<R, E>) => App.Default<R, E> = internal.xForwardedHeaders
