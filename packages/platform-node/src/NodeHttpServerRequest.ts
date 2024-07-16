/**
 * @since 1.0.0
 */
import type * as ServerRequest from "@effect/platform/HttpServerRequest"
import type * as Http from "node:http"
import * as internal from "./internal/httpServer.js"

/**
 * @category conversions
 * @since 1.0.0
 */
export const toIncomingMessage: (self: ServerRequest.HttpServerRequest) => Http.IncomingMessage =
  internal.toIncomingMessage

/**
 * @category conversions
 * @since 1.0.0
 */
export const toServerResponse: (self: ServerRequest.HttpServerRequest) => Http.ServerResponse =
  internal.toServerResponse
