/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import { hasProperty } from "effect/Predicate"
import * as Schema from "effect/Schema"
import type { Mutable, Simplify } from "effect/Types"
import type * as HttpApiSecurity from "./HttpApiSecurity.js"
import type * as HttpRouter from "./HttpRouter.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform/HttpApiMiddleware")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export const SecurityTypeId: unique symbol = Symbol.for("@effect/platform/HttpApiMiddleware/Security")

/**
 * @since 1.0.0
 * @category type ids
 */
export type SecurityTypeId = typeof SecurityTypeId

/**
 * @since 1.0.0
 * @category guards
 */
export const isSecurity = (u: TagClassAny): u is TagClassSecurityAny => hasProperty(u, SecurityTypeId)

/**
 * @since 1.0.0
 * @category models
 */
export interface HttpApiMiddleware<Provides, E> extends Effect.Effect<Provides, E, HttpRouter.HttpRouter.Provided> {}

/**
 * @since 1.0.0
 * @category models
 */
export type HttpApiMiddlewareSecurity<Security extends Record<string, HttpApiSecurity.HttpApiSecurity>, Provides, E> = {
  readonly [K in keyof Security]: (
    _: HttpApiSecurity.HttpApiSecurity.Type<Security[K]>
  ) => Effect.Effect<Provides, E, HttpRouter.HttpRouter.Provided>
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace HttpApiMiddleware {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Any {
    readonly [TypeId]: TypeId
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface AnyId {
    readonly [TypeId]: {
      readonly provides: any
    }
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Provides<A> = A extends { readonly [TypeId]: { readonly provides: infer P } } ? P : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type ExtractProvides<A> = Provides<Only<A>>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Error<A> = A extends { readonly [TypeId]: { readonly failure: infer E } } ? E : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Only<R> = Extract<R, AnyId>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Without<R> = Exclude<R, AnyId>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface TagClass<
  Self,
  Name extends string,
  Provides,
  S,
  Failure extends Schema.Schema.All,
  Optional extends boolean
> extends Context.Tag<Self, HttpApiMiddleware<S, Schema.Schema.Type<Failure>>> {
  new(_: never): Context.TagClassShape<Name, HttpApiMiddleware<S, Schema.Schema.Type<Failure>>> & {
    readonly [TypeId]: {
      readonly provides: Optional extends true ? never : Provides
      readonly failure: Optional extends true ? never : Schema.Schema.Type<Failure>
    }
  }
  readonly [TypeId]: TypeId
  readonly optional: boolean
  readonly provides: Context.Tag<Optional extends true ? never : Provides, S> | undefined
  readonly failure: Optional extends true ? typeof Schema.Never : Failure
}

/**
 * @since 1.0.0
 * @category models
 */
export interface TagClassSecurity<
  Self,
  Name extends string,
  Security extends Record<string, HttpApiSecurity.HttpApiSecurity>,
  Provides,
  S,
  Failure extends Schema.Schema.All,
  Optional extends boolean
> extends Context.Tag<Self, Simplify<HttpApiMiddlewareSecurity<Security, S, Schema.Schema.Type<Failure>>>> {
  new(_: never): Context.TagClassShape<Name, HttpApiMiddlewareSecurity<Security, S, Schema.Schema.Type<Failure>>> & {
    readonly [TypeId]: {
      readonly provides: Optional extends true ? never : Provides
      readonly failure: Optional extends true ? never : Schema.Schema.Type<Failure>
    }
  }
  readonly [TypeId]: TypeId
  readonly [SecurityTypeId]: SecurityTypeId
  readonly security: Security
  readonly optional: boolean
  readonly provides: Context.Tag<Optional extends true ? never : Provides, S> | undefined
  readonly failure: Optional extends true ? typeof Schema.Never : Failure
}

/**
 * @since 1.0.0
 * @category models
 */
export interface TagClassAny extends Context.Tag<any, HttpApiMiddleware.Any> {
  readonly [TypeId]: TypeId
  readonly optional: boolean
  readonly provides: Context.Tag<any, any> | Context.Tag<never, void> | undefined
  readonly failure: Schema.Schema.All
}

/**
 * @since 1.0.0
 * @category models
 */
export interface TagClassSecurityAny extends TagClassAny {
  readonly [SecurityTypeId]: SecurityTypeId
  readonly security: Record<string, HttpApiSecurity.HttpApiSecurity>
}

/**
 * @since 1.0.0
 * @category tags
 */
export const Tag = <Self>(): {
  <
    const Name extends string,
    Provides = never,
    S = void,
    Failure extends Schema.Schema.All = typeof Schema.Never,
    const Optional extends boolean = false
  >(
    id: Name,
    options?: {
      readonly optional?: Optional | undefined
      readonly failure?: Failure
      readonly provides?: Context.Tag<Provides, S>
      readonly security?: undefined
    }
  ): TagClass<Self, Name, Provides, S, Failure, Optional>
  <
    const Name extends string,
    const Security extends Record<string, HttpApiSecurity.HttpApiSecurity>,
    Provides = never,
    S = void,
    Failure extends Schema.Schema.All = typeof Schema.Never,
    const Optional extends boolean = false
  >(
    id: Name,
    options: {
      readonly optional?: Optional | undefined
      readonly security: Security
      readonly failure?: Failure
      readonly provides?: Context.Tag<Provides, S>
    }
  ): TagClassSecurity<
    Self,
    Name,
    Security,
    Provides,
    S,
    Failure,
    Optional
  >
} =>
(
  id: string,
  options?: {
    readonly optional?: boolean
    readonly security?: Record<string, HttpApiSecurity.HttpApiSecurity>
    readonly failure?: Schema.Schema.All
    readonly provides?: Context.Tag<any, any>
  }
) => {
  const Err = globalThis.Error as any
  const limit = Err.stackTraceLimit
  Err.stackTraceLimit = 2
  const creationError = new Err()
  Err.stackTraceLimit = limit

  function TagClass() {}
  const TagClass_ = TagClass as any as Mutable<TagClassSecurityAny>
  Object.setPrototypeOf(TagClass, Object.getPrototypeOf(Context.GenericTag<Self, any>(id)))
  TagClass.key = id
  Object.defineProperty(TagClass, "stack", {
    get() {
      return creationError.stack
    }
  })
  TagClass_[TypeId] = TypeId
  TagClass_.failure = options?.optional === true || options?.failure === undefined ? Schema.Never : options.failure
  TagClass_.provides = options?.provides
  TagClass_.optional = options?.optional ?? false
  if (options?.security) {
    if (Object.keys(options.security).length === 0) {
      throw new Error("HttpApiMiddleware.Tag: security object must not be empty")
    }
    TagClass_[SecurityTypeId] = SecurityTypeId
    TagClass_.security = options.security
  }
  return TagClass as any
}
