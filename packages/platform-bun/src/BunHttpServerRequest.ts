/**
 * @since 1.0.0
 */
import type * as ServerRequest from "@effect/platform/HttpServerRequest"
import * as internal from "./internal/httpServer.js"

/**
 * @category conversions
 * @since 1.0.0
 */
export const toRequest: (self: ServerRequest.HttpServerRequest) => Request = internal.requestSource
