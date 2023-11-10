/**
 * This module provides types and utility functions to create and work with branded types,
 * which are TypeScript types with an added type tag to prevent accidental usage of a value in the wrong context.
 *
 * The `refined` and `nominal` functions are both used to create branded types in TypeScript.
 * The main difference between them is that `refined` allows for validation of the data, while `nominal` does not.
 *
 * The `nominal` function is used to create a new branded type that has the same underlying type as the input, but with a different name.
 * This is useful when you want to distinguish between two values of the same type that have different meanings.
 * The `nominal` function does not perform any validation of the input data.
 *
 * On the other hand, the `refined` function is used to create a new branded type that has the same underlying type as the input,
 * but with a different name, and it also allows for validation of the input data.
 * The `refined` function takes a predicate that is used to validate the input data.
 * If the input data fails the validation, a `BrandErrors` is returned, which provides information about the specific validation failure.
 *
 * @since 2.0.0
 */
import type { Either } from "./Either.js"
import type { BrandTypeId, RefinedConstructorsTypeId } from "./impl/Brand.js"
import type { Option } from "./Option.js"
import type { Refinement } from "./Predicate.js"
import type { Types } from "./Types.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/Brand.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/Brand.js"

/**
 * A generic interface that defines a branded type.
 *
 * @since 2.0.0
 * @category models
 */
export interface Brand<in out K extends string | symbol> {
  readonly [BrandTypeId]: {
    readonly [k in K]: K
  }
}

/**
 * @since 2.0.0
 */
export declare namespace Brand {
  /**
   * Represents a list of refinement errors.
   *
   * @since 2.0.0
   * @category models
   */
  export interface BrandErrors extends ReadonlyArray<RefinementError> {}

  /**
   * Represents an error that occurs when the provided value of the branded type does not pass the refinement predicate.
   *
   * @since 2.0.0
   * @category models
   */
  export interface RefinementError {
    readonly meta: unknown
    readonly message: string
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface Constructor<in out A extends Brand<any>> {
    readonly [RefinedConstructorsTypeId]: RefinedConstructorsTypeId
    /**
     * Constructs a branded type from a value of type `A`, throwing an error if
     * the provided `A` is not valid.
     */
    (args: Brand.Unbranded<A>): A
    /**
     * Constructs a branded type from a value of type `A`, returning `Some<A>`
     * if the provided `A` is valid, `None` otherwise.
     */
    option: (args: Brand.Unbranded<A>) => Option<A>
    /**
     * Constructs a branded type from a value of type `A`, returning `Right<A>`
     * if the provided `A` is valid, `Left<BrandError>` otherwise.
     */
    either: (args: Brand.Unbranded<A>) => Either<Brand.BrandErrors, A>
    /**
     * Attempts to refine the provided value of type `A`, returning `true` if
     * the provided `A` is valid, `false` otherwise.
     */
    is: Refinement<Brand.Unbranded<A>, Brand.Unbranded<A> & A>
  }

  /**
   * A utility type to extract a branded type from a `Brand.Constructor`.
   *
   * @since 2.0.0
   * @category models
   */
  export type FromConstructor<A> = A extends Brand.Constructor<infer B> ? B : never

  /**
   * A utility type to extract the value type from a brand.
   *
   * @since 2.0.0
   * @category models
   */
  export type Unbranded<P> = P extends infer Q & Brands<P> ? Q : P

  /**
   * A utility type to extract the brands from a branded type.
   *
   * @since 2.0.0
   * @category models
   */
  export type Brands<P> = P extends Brand<any> ? Types.UnionToIntersection<
      {
        [k in keyof P[BrandTypeId]]: k extends string | symbol ? Brand<k>
          : never
      }[keyof P[BrandTypeId]]
    >
    : never

  /**
   * A utility type that checks that all brands have the same base type.
   *
   * @since 2.0.0
   * @category models
   */
  export type EnsureCommonBase<
    Brands extends readonly [Brand.Constructor<any>, ...Array<Brand.Constructor<any>>]
  > = {
    [B in keyof Brands]: Brand.Unbranded<Brand.FromConstructor<Brands[0]>> extends
      Brand.Unbranded<Brand.FromConstructor<Brands[B]>>
      ? Brand.Unbranded<Brand.FromConstructor<Brands[B]>> extends Brand.Unbranded<Brand.FromConstructor<Brands[0]>>
        ? Brands[B]
      : Brands[B]
      : "ERROR: All brands should have the same base type"
  }

  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Brand.js"
}
