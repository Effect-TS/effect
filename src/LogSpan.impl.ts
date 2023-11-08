/**
 * @since 2.0.0
 */
import * as internal from "./internal/logSpan.js"

import type { LogSpan } from "./LogSpan.js"

export declare namespace LogSpan {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./LogSpan.impl.js"
}
  /**
   * @since 2.0.0
   * @category models
   */
  export interface LogSpan {
    readonly label: string
    readonly startTime: number
  }
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const make: (label: string, startTime: number) => LogSpan = internal.make

/**
 * @since 2.0.0
 * @category destructors
 */
export const render: (now: number) => (self: LogSpan) => string = internal.render
