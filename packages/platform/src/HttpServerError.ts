/**
 * @since 1.0.0
 */
import type * as Cause from "effect/Cause"
import type * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import type * as FiberId from "effect/FiberId"
import type * as Option from "effect/Option"
import { RefailError, TypeIdError } from "./Error.js"
import type * as ServerRequest from "./HttpServerRequest.js"
import * as Respondable from "./HttpServerRespondable.js"
import * as ServerResponse from "./HttpServerResponse.js"
import * as internal from "./internal/httpServerError.js"

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
 * @category error
 */
export class RequestError extends RefailError(TypeId, "RequestError")<{
  readonly request: ServerRequest.HttpServerRequest
  readonly reason: "Transport" | "Decode"
}> implements Respondable.Respondable {
  /**
   * @since 1.0.0
   */
  [Respondable.symbol]() {
    return ServerResponse.empty({ status: 400 })
  }

  get methodAndUrl() {
    return `${this.request.method} ${this.request.url}`
  }

  get message() {
    return `${this.reason} error (${this.methodAndUrl}): ${super.message}`
  }
}

/**
 * @since 1.0.0
 * @category predicates
 */
export const isServerError: (u: unknown) => u is HttpServerError = internal.isServerError

/**
 * @since 1.0.0
 * @category error
 */
export class RouteNotFound extends TypeIdError(TypeId, "RouteNotFound")<{
  readonly request: ServerRequest.HttpServerRequest
}> {
  constructor(options: { request: ServerRequest.HttpServerRequest }) {
    super(options)
    ;(this as any).stack = `${this.name}: ${this.message}`
  }
  /**
   * @since 1.0.0
   */
  [Respondable.symbol]() {
    return ServerResponse.empty({ status: 404 })
  }
  get message() {
    return `${this.request.method} ${this.request.url} not found`
  }
}

/**
 * @since 1.0.0
 * @category error
 */
export class ResponseError extends RefailError(TypeId, "ResponseError")<{
  readonly request: ServerRequest.HttpServerRequest
  readonly response: ServerResponse.HttpServerResponse
  readonly reason: "Decode"
}> {
  /**
   * @since 1.0.0
   */
  [Respondable.symbol]() {
    return ServerResponse.empty({ status: 500 })
  }

  get methodAndUrl() {
    return `${this.request.method} ${this.request.url}`
  }

  get message() {
    return `${this.reason} error (${this.response.status} ${this.methodAndUrl}): ${super.message}`
  }
}

/**
 * @since 1.0.0
 * @category error
 */
export class ServeError extends RefailError(TypeId, "ServeError")<{}> {}

/**
 * @since 1.0.0
 */
export const clientAbortFiberId: FiberId.FiberId = internal.clientAbortFiberId

/**
 * @since 1.0.0
 */
export const causeResponse: <E>(
  cause: Cause.Cause<E>
) => Effect.Effect<readonly [ServerResponse.HttpServerResponse, Cause.Cause<E>]> = internal.causeResponse

/**
 * @since 1.0.0
 */
export const causeResponseStripped: <E>(
  cause: Cause.Cause<E>
) => readonly [response: ServerResponse.HttpServerResponse, cause: Option.Option<Cause.Cause<E>>] =
  internal.causeResponseStripped

/**
 * @since 1.0.0
 */
export const exitResponse: <E>(
  exit: Exit.Exit<ServerResponse.HttpServerResponse, E>
) => ServerResponse.HttpServerResponse = internal.exitResponse
