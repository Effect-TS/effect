import type { BrandTypeId, RefinedConstructorsTypeId } from "../Brand.js"
import type { Either } from "./Either.js"
import type { Option } from "./Option.js"
import type { Refinement } from "./Predicate.js"
import type { Types } from "./Types.js"

export * from "../Brand.js"
export * from "../internal/Jumpers/Brand.js"

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
  export type * from "../Brand.js"
}
