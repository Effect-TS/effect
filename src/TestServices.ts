import type { TestAnnotations } from "./TestAnnotations.js"
import type { TestConfig } from "./TestConfig.js"
import type { TestLive } from "./TestLive.js"
import type { TestSized } from "./TestSized.js"

export * from "./internal/Jumpers/TestServices.js"
export * from "./TestServices.impl.js"

export declare namespace TestServices {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./TestServices.impl.js"
}
/**
 * @since 2.0.0
 */
export type TestServices =
  | TestAnnotations
  | TestLive
  | TestSized
  | TestConfig
