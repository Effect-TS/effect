/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import { dual } from "effect/Function"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import type { Redacted } from "effect/Redacted"
import type { Covariant } from "effect/Types"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform/HttpApiSecurity")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export type HttpApiSecurity = Bearer | ApiKey | Basic

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace HttpApiSecurity {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto<out A> extends Pipeable {
    readonly [TypeId]: {
      readonly _A: Covariant<A>
    }
    readonly annotations: Context.Context<never>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Type<A extends HttpApiSecurity> = A extends Proto<infer Out> ? Out : never
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Bearer extends HttpApiSecurity.Proto<Redacted> {
  readonly _tag: "Bearer"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface ApiKey extends HttpApiSecurity.Proto<Redacted> {
  readonly _tag: "ApiKey"
  readonly in: "header" | "query" | "cookie"
  readonly key: string
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Basic extends HttpApiSecurity.Proto<Credentials> {
  readonly _tag: "Basic"
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Credentials {
  readonly username: string
  readonly password: Redacted
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * Create an Bearer token security scheme.
 *
 * You can implement some api middleware for this security scheme using
 * `HttpApiBuilder.middlewareSecurity`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const bearer: Bearer = Object.assign(Object.create(Proto), {
  _tag: "Bearer",
  annotations: Context.empty()
})

/**
 * Create an API key security scheme.
 *
 * You can implement some api middleware for this security scheme using
 * `HttpApiBuilder.middlewareSecurity`.
 *
 * To set the correct cookie in a handler, you can use
 * `HttpApiBuilder.securitySetCookie`.
 *
 * The default value for `in` is "header".
 *
 * @since 1.0.0
 * @category constructors
 */
export const apiKey = (options: {
  readonly key: string
  readonly in?: "header" | "query" | "cookie" | undefined
}): ApiKey =>
  Object.assign(Object.create(Proto), {
    _tag: "ApiKey",
    key: options.key,
    in: options.in ?? "header",
    annotations: Context.empty()
  })

/**
 * @since 1.0.0
 * @category constructors
 */
export const basic: Basic = Object.assign(Object.create(Proto), {
  _tag: "Basic",
  annotations: Context.empty()
})

/**
 * @since 1.0.0
 * @category annotations
 */
export const annotateContext: {
  <I>(context: Context.Context<I>): <A extends HttpApiSecurity>(self: A) => A
  <A extends HttpApiSecurity, I>(self: A, context: Context.Context<I>): A
} = dual(
  2,
  <A extends HttpApiSecurity, I>(self: A, context: Context.Context<I>): A =>
    Object.assign(Object.create(Proto), {
      ...self,
      annotations: Context.merge(self.annotations, context)
    })
)

/**
 * @since 1.0.0
 * @category annotations
 */
export const annotate: {
  <I, S>(tag: Context.Tag<I, S>, value: S): <A extends HttpApiSecurity>(self: A) => A
  <A extends HttpApiSecurity, I, S>(self: A, tag: Context.Tag<I, S>, value: S): A
} = dual(
  3,
  <A extends HttpApiSecurity, I, S>(self: A, tag: Context.Tag<I, S>, value: S): A =>
    Object.assign(Object.create(Proto), {
      ...self,
      annotations: Context.add(self.annotations, tag, value)
    })
)
