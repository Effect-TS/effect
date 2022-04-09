/**
 * Adds the specified execution trace to traces.
 *
 * @tsplus fluent ets/Cause traced
 */
export function traced_<E>(self: Cause<E>, trace: Trace): Cause<E> {
  return self.mapTrace((_) => _ + trace);
}

/**
 * Adds the specified execution trace to traces.
 *
 * @ets_data_first traced_
 */
export const traced = Pipeable(traced_);
