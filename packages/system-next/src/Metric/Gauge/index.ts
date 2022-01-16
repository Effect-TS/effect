// ets_tracing: off

import { _A } from "../../Effect"
import type { UIO } from "../_internal/effect"

/**
 * A `Gauge` is a metric representing a single numerical value that may be set
 * or adjusted. A typical use of this metric would be to track the current
 * memory usage. With a gauge the quantity of interest is the current value, as
 * opposed to a counter where the quantity of interest is the cumulative values
 * over time.
 */
export class Gauge<A> {
  readonly [_A]: (_: A) => A

  constructor(
    /**
     * The current value of the gauge.
     */
    readonly value: UIO<number>,
    /**
     * Sets the gauge to the specified value.
     */
    readonly set: (value: number, __trace?: string) => UIO<any>,
    /**
     * Adjusts the gauge by the specified amount.
     */
    readonly adjust: (value: number, __trace?: string) => UIO<any>
  ) {}
}
