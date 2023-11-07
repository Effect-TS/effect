/**
 * @since 1.0.0
 */
import type * as Data from "effect/Data"
import * as internal from "../internal/http/serverError.js"
import type * as ServerRequest from "./ServerRequest.js"
import type * as ServerResponse from "./ServerResponse.js"

/**
 * @since 1.0.0
 * @category type id
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @since 1.0.0
 * @category type id
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category error
 */
export type HttpServerError = RequestError | ResponseError | RouteNotFound | ServeError

/**
 * @since 1.0.0
 */
export declare namespace HttpError {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto extends Data.Case {
    readonly [TypeId]: TypeId
    readonly _tag: string
  }

  /**
   * @since 1.0.0
   */
  export type ProvidedFields = TypeId | "_tag" | keyof Data.Case
}

/**
 * @since 1.0.0
 * @category error
 */
export interface RequestError extends HttpError.Proto {
  readonly _tag: "RequestError"
  readonly request: ServerRequest.ServerRequest
  readonly reason: "Transport" | "Decode"
  readonly error: unknown
}

/**
 * @since 1.0.0
 * @category error
 */
export const RequestError: (props: Omit<RequestError, HttpError.ProvidedFields>) => RequestError = internal.requestError

/**
 * @since 1.0.0
 * @category error
 */
export interface RouteNotFound extends HttpError.Proto {
  readonly _tag: "RouteNotFound"
  readonly request: ServerRequest.ServerRequest
}

/**
 * @since 1.0.0
 * @category error
 */
export const RouteNotFound: (props: Omit<RouteNotFound, HttpError.ProvidedFields>) => RouteNotFound =
  internal.routeNotFound

/**
 * @since 1.0.0
 * @category error
 */
export interface ResponseError extends HttpError.Proto {
  readonly _tag: "ResponseError"
  readonly request: ServerRequest.ServerRequest
  readonly response: ServerResponse.ServerResponse
  readonly reason: "Decode"
  readonly error: unknown
}

/**
 * @since 1.0.0
 * @category error
 */
export const ResponseError: (props: Omit<ResponseError, HttpError.ProvidedFields>) => ResponseError =
  internal.responseError

/**
 * @since 1.0.0
 * @category error
 */
export interface ServeError extends HttpError.Proto {
  readonly _tag: "ServeError"
  readonly error: unknown
}

/**
 * @since 1.0.0
 * @category error
 */
export const ServeError: (props: Omit<ServeError, HttpError.ProvidedFields>) => ServeError = internal.serveError
