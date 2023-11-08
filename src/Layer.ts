import type { LayerTypeId } from "./Layer.impl.js"
import type { Pipeable } from "./Pipeable.js"

export * from "./internal/Jumpers/Layer.js"
export * from "./Layer.impl.js"

export declare namespace Layer {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./Layer.impl.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface Layer<RIn, E, ROut> extends Layer.Variance<RIn, E, ROut>, Pipeable {}

/**
 * @since 2.0.0
 */
export declare namespace Layer {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Variance<RIn, E, ROut> {
    readonly [LayerTypeId]: {
      readonly _RIn: (_: never) => RIn
      readonly _E: (_: never) => E
      readonly _ROut: (_: ROut) => void
    }
  }
  /**
   * @since 2.0.0
   * @category type-level
   */
  export type Context<T extends Layer<any, any, never>> = [T] extends [Layer<infer _R, infer _E, infer _A>] ? _R
    : never
  /**
   * @since 2.0.0
   * @category type-level
   */
  export type Error<T extends Layer<any, any, never>> = [T] extends [Layer<infer _R, infer _E, infer _A>] ? _E : never
  /**
   * @since 2.0.0
   * @category type-level
   */
  export type Success<T extends Layer<any, any, never>> = [T] extends [Layer<infer _R, infer _E, infer _A>] ? _A
    : never
}
