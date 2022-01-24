import { _A } from "../../support/Symbols"
import type { UIO } from "./_internal/effect"

/**
 * A `Counter` is a metric representing a single numerical value that may be
 * incremented over time. A typical use of this metric would be to track the
 * number of a certain type of request received. With a counter the quantity of
 * interest is the cumulative value over time, as opposed to a gauge where the
 * quantity of interest is the value as of a specific point in time.
 */
export class Counter<A> {
  readonly [_A]: (_: A) => A

  constructor(
    /**
     * The current value of the counter.
     */
    readonly count: UIO<number>,
    /**
     * Increments the counter by the specified amount.
     */
    readonly incrementBy: (value: number, __trace?: string) => UIO<any>,
    readonly unsafeCount: () => number,
    readonly unsafeIncrementBy: (value: number) => void
  ) {}

  get increment(): UIO<any> {
    return this.incrementBy(1)
  }

  unsafeIncrement(): void {
    this.unsafeIncrementBy(1)
  }
}
