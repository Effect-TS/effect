/**
 * @since 1.0.0
 */
import type * as Cause from "effect/Cause"
import type * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import type * as FiberId from "effect/FiberId"
import type * as Option from "effect/Option"
import { TypeIdError } from "./Error.js"
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
export class RequestError extends TypeIdError(TypeId, "RequestError")<{
  readonly request: ServerRequest.HttpServerRequest
  readonly reason: "Transport" | "Decode"
  readonly cause?: unknown
  readonly description?: string
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
    return this.description ?
      `${this.reason}: ${this.description} (${this.methodAndUrl})` :
      `${this.reason} error (${this.methodAndUrl})`
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
export class ResponseError extends TypeIdError(TypeId, "ResponseError")<{
  readonly request: ServerRequest.HttpServerRequest
  readonly response: ServerResponse.HttpServerResponse
  readonly reason: "Decode"
  readonly cause?: unknown
  readonly description?: string
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
    const info = `${this.response.status} ${this.methodAndUrl}`
    return this.description ?
      `${this.description} (${info})` :
      `${this.reason} error (${info})`
  }
}

/**
 * @since 1.0.0
 * @category error
 */
export class ServeError extends TypeIdError(TypeId, "ServeError")<{
  readonly cause: unknown
}> {}

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
