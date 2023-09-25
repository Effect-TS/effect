/**
 * @since 1.0.0
 */
import * as internal from "./internal/logSpan"

/**
 * @since 1.0.0
 * @category models
 */
export interface LogSpan {
  readonly label: string
  readonly startTime: number
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (label: string, startTime: number) => LogSpan = internal.make

/**
 * @since 1.0.0
 * @category destructors
 */
export const render: (now: number) => (self: LogSpan) => string = internal.render
