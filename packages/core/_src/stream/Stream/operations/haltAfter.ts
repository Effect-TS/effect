/**
 * Specialized version of haltWhen which halts the evaluation of this stream
 * after the given duration.
 *
 * An element in the process of being pulled will not be interrupted when the
 * given duration completes. See `interruptAfter` for this behavior.
 *
 * @tsplus fluent ets/Stream haltAfter
 */
export function haltAfter_<R, E, A>(
  self: Stream<R, E, A>,
  duration: LazyArg<Duration>,
  __tsplusTrace?: string
): Stream<R, E, A> {
  return self.haltWhen(Effect.sleep(duration))
}

/**
 * Specialized version of haltWhen which halts the evaluation of this stream
 * after the given duration.
 *
 * An element in the process of being pulled will not be interrupted when the
 * given duration completes. See `interruptAfter` for this behavior.
 *
 * @tsplus static ets/Stream/Aspects haltAfter
 */
export const haltAfter = Pipeable(haltAfter_)
