/**
 * @since 1.0.0
 */
import * as Error from "@effect/platform/Error"
import * as internal from "../internal/http/clientError.js"
import type * as ClientRequest from "./ClientRequest.js"
import type * as ClientResponse from "./ClientResponse.js"

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
export type HttpClientError = RequestError | ResponseError

/**
 * @since 1.0.0
 * @category error
 */
export class RequestError extends Error.RefailError(TypeId, "RequestError")<{
  readonly request: ClientRequest.ClientRequest
  readonly reason: "Transport" | "Encode" | "InvalidUrl"
}> {
  get methodAndUrl() {
    return `${this.request.method} ${this.request.url}`
  }

  get message() {
    const errorString = super.message
    return `${this.reason} error (${this.methodAndUrl}): ${errorString}`
  }
}

/**
 * @since 1.0.0
 * @category error
 */
export class ResponseError extends Error.RefailError(TypeId, "ResponseError")<{
  readonly request: ClientRequest.ClientRequest
  readonly response: ClientResponse.ClientResponse
  readonly reason: "StatusCode" | "Decode" | "EmptyBody"
}> {
  get methodAndUrl() {
    return `${this.request.method} ${this.request.url}`
  }

  get message() {
    const errorString = super.message
    return `${this.reason} error (${this.methodAndUrl}): ${errorString}`
  }
}
