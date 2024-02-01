/**
 * @since 1.0.0
 */
import type * as ServerRequest from "@effect/platform/Http/ServerRequest"
import type * as Http from "node:http"
import * as internal from "../internal/http/server.js"

/**
 * @category conversions
 * @since 1.0.0
 */
export const toIncomingMessage: (self: ServerRequest.ServerRequest) => Http.IncomingMessage = internal.requestSource
