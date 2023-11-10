/**
 * @since 2.0.0
 */
import type { Equal } from "./Equal.js"
import type { ConfigSecretTypeId } from "./impl/ConfigSecret.js"

/**
 * @since 2.0.0
 */
export * from "./impl/ConfigSecret.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/ConfigSecret.js"

/**
 * @since 2.0.0
 * @category models
 */
export interface ConfigSecret extends ConfigSecret.Proto, Equal {
  /** @internal */
  readonly raw: Array<number>
}

/**
 * @since 2.0.0
 */
export declare namespace ConfigSecret {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface Proto {
    readonly [ConfigSecretTypeId]: ConfigSecretTypeId
  }

  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/ConfigSecret.js"
}
