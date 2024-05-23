/**
 * @since 1.0.0
 */
import type * as Effect from "effect/Effect"
import type * as FiberRef from "effect/FiberRef"
import type * as Layer from "effect/Layer"
import type * as Predicate from "effect/Predicate"
import * as internal from "../internal/http/middleware.js"
import type * as App from "./App.js"
import type * as ServerRequest from "./ServerRequest.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface Middleware {
  <E, R>(self: App.Default<E, R>): App.Default<any, any>
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
export const logger: <E, R>(httpApp: App.Default<E, R>) => App.Default<E, R> = internal.logger

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const loggerDisabled: FiberRef.FiberRef<boolean> = internal.loggerDisabled

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withLoggerDisabled: <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R> =
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
  ): <A, E, R>(layer: Layer.Layer<A, E, R>) => Layer.Layer<A, E, R>
  <A, E, R>(
    layer: Layer.Layer<A, E, R>,
    predicate: Predicate.Predicate<ServerRequest.ServerRequest>
  ): Layer.Layer<A, E, R>
} = internal.withTracerDisabledWhen

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withTracerDisabledWhenEffect: {
  (
    predicate: Predicate.Predicate<ServerRequest.ServerRequest>
  ): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    predicate: Predicate.Predicate<ServerRequest.ServerRequest>
  ): Effect.Effect<A, E, R>
} = internal.withTracerDisabledWhenEffect

/**
 * @since 1.0.0
 * @category fiber refs
 */
export const withTracerDisabledForUrls: {
  (urls: ReadonlyArray<string>): <A, E, R>(layer: Layer.Layer<A, E, R>) => Layer.Layer<A, E, R>
  <A, E, R>(layer: Layer.Layer<A, E, R>, urls: ReadonlyArray<string>): Layer.Layer<A, E, R>
} = internal.withTracerDisabledForUrls

/**
 * @since 1.0.0
 * @category constructors
 */
export const xForwardedHeaders: <E, R>(httpApp: App.Default<E, R>) => App.Default<E, R> = internal.xForwardedHeaders

/**
 * @since 1.0.0
 * @category constructors
 */
export const searchParamsParser: <E, R>(
  httpApp: App.Default<E, R>
) => App.Default<
  E,
  Exclude<R, ServerRequest.ParsedSearchParams>
> = internal.searchParamsParser
