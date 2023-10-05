/**
 * @since 1.0.0
 */
import * as internal from "../internal/http/middleware"
import type * as App from "./App"

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
