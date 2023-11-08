import type { TestAnnotations } from "./TestAnnotations.js"
import type { TestConfig } from "./TestConfig.js"
import type { TestLive } from "./TestLive.js"
import type { TestSized } from "./TestSized.js"

export * from "./impl/TestServices.js"
export * from "./internal/Jumpers/TestServices.js"

export declare namespace TestServices {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/TestServices.js"
}
/**
 * @since 2.0.0
 */
export type TestServices =
  | TestAnnotations
  | TestLive
  | TestSized
  | TestConfig
