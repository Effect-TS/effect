/**
 * Returns a new schedule that deals with a narrower class of inputs than this
 * schedule.
 *
 * @tsplus static effect/core/io/Schedule.Aspects contramap
 * @tsplus pipeable effect/core/io/Schedule contramap
 * @category mapping
 * @since 1.0.0
 */
export function contramap<In, In2>(f: (in2: In2) => In) {
  return <State, Env, Out>(self: Schedule<State, Env, In, Out>): Schedule<State, Env, In2, Out> =>
    self.contramapEffect((input2) => Effect.sync(f(input2)))
}
