/**
 * @since 1.0.0
 */
import * as ParseResult from "@effect/schema/ParseResult"
import * as Effect from "effect/Effect"
import { hasProperty } from "effect/Predicate"
import type { HttpServerResponse } from "./HttpServerResponse.js"
import * as ServerResponse from "./HttpServerResponse.js"

/**
 * @since 1.0.0
 * @category symbols
 */
export const symbol: unique symbol = Symbol.for("@effect/platform/HttpServerRespondable")

/**
 * @since 1.0.0
 * @category models
 */
export interface Respondable {
  readonly [symbol]: () => Effect.Effect<HttpServerResponse, unknown>
}

/**
 * @since 1.0.0
 * @category guards
 */
export const isRespondable = (u: unknown): u is Respondable => hasProperty(u, symbol)

const badRequest = ServerResponse.empty({ status: 400 })

/**
 * @since 1.0.0
 * @category accessors
 */
export const toResponse = (self: Respondable): Effect.Effect<HttpServerResponse> => {
  if (ServerResponse.isServerResponse(self)) {
    return Effect.succeed(self)
  }
  return Effect.orDie(self[symbol]())
}

/**
 * @since 1.0.0
 * @category accessors
 */
export const toResponseOrElse = (u: unknown, orElse: HttpServerResponse): Effect.Effect<HttpServerResponse> => {
  if (ServerResponse.isServerResponse(u)) {
    return Effect.succeed(u)
  } else if (isRespondable(u)) {
    return Effect.catchAllCause(u[symbol](), () => Effect.succeed(orElse))
    // add support for some commmon types
  } else if (ParseResult.isParseError(u)) {
    return Effect.succeed(badRequest)
  }
  return Effect.succeed(orElse)
}
