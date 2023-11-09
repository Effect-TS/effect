import type { Clock } from "./Clock.js"
import type { ConfigProvider } from "./ConfigProvider.js"
import type { Console } from "./Console.js"
import type { Random } from "./Random.js"
import type { Tracer } from "./Tracer.js"

export * from "../DefaultServices.js"
export * from "../internal/Jumpers/DefaultServices.js"

export declare namespace DefaultServices {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../DefaultServices.js"
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
