/**
 * @since 1.0.0
 */
import type * as ServerRequest from "@effect/platform/Http/ServerRequest"
import * as internal from "../internal/http/server.js"

/**
 * @category conversions
 * @since 1.0.0
 */
export const toRequest: (self: ServerRequest.ServerRequest) => Request = internal.requestSource
