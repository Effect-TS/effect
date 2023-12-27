/**
 * @since 1.0.0
 *
 * Also includes exports from [`@effect/platform/Http/ServerRequest`](https://effect-ts.github.io/platform/platform/Http/ServerRequest.ts.html).
 */
import type * as ServerRequest from "@effect/platform/Http/ServerRequest"
import type * as Http from "node:http"
import * as internal from "../internal/http/server.js"

/**
 * @since 1.0.0
 */
export * from "@effect/platform/Http/ServerRequest"

/**
 * @category conversions
 * @since 1.0.0
 */
export const toIncomingMessage: (self: ServerRequest.ServerRequest) => Http.IncomingMessage = internal.requestSource
