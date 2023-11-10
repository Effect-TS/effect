/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/RuntimeFlagsPatch.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/RuntimeFlagsPatch.js"

/**
 * @since 2.0.0
 */
export declare namespace RuntimeFlagsPatch {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/RuntimeFlagsPatch.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export type RuntimeFlagsPatch = number & {
  readonly RuntimeFlagsPatch: unique symbol
}
