import { addDelay_ } from "./addDelay_"
import { forever } from "./forever"

/**
 * A schedule that waits for the specified amount of time between each
 * input. Returns the number of inputs so far.
 *
 * <pre>
 * |action|-----interval-----|action|-----interval-----|action|
 * </pre>
 */
export const spaced = (interval: number) => addDelay_(forever, () => interval)
