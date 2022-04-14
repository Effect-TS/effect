/**
 * Returns a new schedule with the specified effectfully computed delay added
 * before the start of each interval produced by this schedule.
 *
 * @tsplus fluent ets/Schedule delayed
 * @tsplus fluent ets/Schedule/WithState delayed
 */
export function delayed_<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>,
  f: (duration: Duration) => Duration
): Schedule<State, Env, In, Out> {
  return self.delayedEffect((duration) => Effect.succeed(f(duration)));
}

/**
 * Returns a new schedule with the specified effectfully computed delay added
 * before the start of each interval produced by this schedule.
 *
 * @tsplus static ets/Schedule/Aspects delayed
 */
export const delayed = Pipeable(delayed_);
