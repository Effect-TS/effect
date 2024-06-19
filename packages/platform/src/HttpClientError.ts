/**
 * @since 1.0.0
 */
import * as Error from "@effect/platform/Error"
import type * as ClientRequest from "./HttpClientRequest.js"
import type * as ClientResponse from "./HttpClientResponse.js"
import * as internal from "./internal/httpClientError.js"

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
  readonly request: ClientRequest.HttpClientRequest
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
  readonly request: ClientRequest.HttpClientRequest
  readonly response: ClientResponse.HttpClientResponse
  readonly reason: "StatusCode" | "Decode" | "EmptyBody"
}> {
  get methodAndUrl() {
    return `${this.request.method} ${this.request.url}`
  }

  get message() {
    const errorString = super.message
    return `${this.reason} error (${this.response.status} ${this.methodAndUrl}): ${errorString}`
  }
}
