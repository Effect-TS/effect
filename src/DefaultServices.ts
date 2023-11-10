/**
 * @since 2.0.0
 */
import type { Clock } from "./Clock.js"
import type { ConfigProvider } from "./ConfigProvider.js"
import type { Console } from "./Console.js"
import type { Random } from "./Random.js"
import type { Tracer } from "./Tracer.js"

/**
 * @since 2.0.0
 */
export * from "./impl/DefaultServices.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/DefaultServices.js"

/**
 * @since 2.0.0
 */
export declare namespace DefaultServices {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/DefaultServices.js"
}
/**
/**
 * @since 2.0.0
 * @category models
 */
export type DefaultServices =
  | Clock
  | Console
  | Random
  | ConfigProvider
  | Tracer
