/**
 * @since 1.0.0
 */
import type * as ClientResponse from "@effect/platform/HttpClientResponse"
import type * as Http from "node:http"
import * as internal from "./internal/httpClient.js"

/**
 * @category conversions
 * @since 1.0.0
 */
export const toIncomingMessage: (self: ClientResponse.HttpClientResponse) => Http.IncomingMessage =
  internal.toIncomingMessage
