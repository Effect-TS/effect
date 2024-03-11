/**
 * @since 1.0.0
 */
import type * as Cause from "effect/Cause"
import type * as FiberId from "effect/FiberId"
import { RefailError, TypeIdError } from "../Error.js"
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
 * @category error
 */
export class RequestError extends RefailError(TypeId, "RequestError")<{
  readonly request: ServerRequest.ServerRequest
  readonly reason: "Transport" | "Decode"
}> {
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
  readonly request: ServerRequest.ServerRequest
}> {
  get message() {
    return `${this.request.method} ${this.request.url} not found`
  }
}

/**
 * @since 1.0.0
 * @category error
 */
export class ResponseError extends RefailError(TypeId, "ResponseError")<{
  readonly request: ServerRequest.ServerRequest
  readonly response: ServerResponse.ServerResponse
  readonly reason: "Decode"
}> {
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
export class ServeError extends RefailError(TypeId, "ServeError")<{}> {
}

/**
 * @since 1.0.0
 */
export const clientAbortFiberId: FiberId.FiberId = internal.clientAbortFiberId

/**
 * @since 1.0.0
 */
export const isClientAbortCause: <E>(cause: Cause.Cause<E>) => boolean = internal.isClientAbortCause
