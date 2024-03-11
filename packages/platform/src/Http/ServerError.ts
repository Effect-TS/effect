/**
 * @since 1.0.0
 */
import type * as Cause from "effect/Cause"
import * as Data from "effect/Data"
import type * as FiberId from "effect/FiberId"
import * as Predicate from "effect/Predicate"
import { RefailClass } from "../Error.js"
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
export class RequestError extends Data.TaggedError("RequestError")<{
  readonly request: ServerRequest.ServerRequest
  readonly reason: "Transport" | "Decode"
  readonly error: unknown
}> {
  readonly [TypeId]: TypeId
  constructor(props: {
    readonly request: ServerRequest.ServerRequest
    readonly reason: "Transport" | "Decode"
    readonly error: unknown
  }) {
    super(props)
    this[TypeId] = TypeId
    if (Predicate.hasProperty(this.error, "stack")) {
      ;(this as any).stack = `${this.stack}\n${this.error.stack}`
    }
  }

  get methodAndUrl() {
    return `${this.request.method} ${this.request.url}`
  }

  get message() {
    const errorString = String(Predicate.hasProperty(this.error, "message") ? this.error.message : this.error)
    return `${this.reason} error (${this.methodAndUrl}): ${errorString}`
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
export class RouteNotFound extends Data.TaggedError("RouteNotFound")<{
  readonly request: ServerRequest.ServerRequest
}> {
  readonly [TypeId]: TypeId
  constructor(props: {
    readonly request: ServerRequest.ServerRequest
  }) {
    super(props)
    this[TypeId] = TypeId
  }

  get message() {
    return `${this.request.method} ${this.request.url} not found`
  }
}

/**
 * @since 1.0.0
 * @category error
 */
export class ResponseError extends RefailClass(TypeId, "ResponseError")<{
  readonly request: ServerRequest.ServerRequest
  readonly response: ServerResponse.ServerResponse
  readonly reason: "Decode"
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
 * @category error
 */
export class ServeError extends RefailClass(TypeId, "ServeError")<{}> {
}

/**
 * @since 1.0.0
 */
export const clientAbortFiberId: FiberId.FiberId = internal.clientAbortFiberId

/**
 * @since 1.0.0
 */
export const isClientAbortCause: <E>(cause: Cause.Cause<E>) => boolean = internal.isClientAbortCause
