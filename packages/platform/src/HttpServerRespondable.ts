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
const internalServerError = () => ServerResponse.empty({ status: 500 })

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
export const toResponseOrElse = (
  u: unknown,
  orElse: () => Effect.Effect<HttpServerResponse, unknown>
): Effect.Effect<HttpServerResponse, unknown> => {
  if (isRespondable(u)) {
    return u[symbol]()
    // add support for some commmon types
  } else if (ParseResult.isParseError(u)) {
    return Effect.succeed(badRequest)
  }
  return orElse()
}

/**
 * @since 1.0.0
 * @category accessors
 */
export const toResponseError = (u: unknown): Effect.Effect<HttpServerResponse, unknown> =>
  toResponseOrElse(u, internalServerError)
