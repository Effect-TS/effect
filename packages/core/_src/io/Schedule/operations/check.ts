/**
 * Returns a new schedule that passes each input and output of this schedule
 * to the specified function, and then determines whether or not to continue
 * based on the return value of the function.
 *
 * @tsplus static effect/core/io/Schedule.Aspects check
 * @tsplus pipeable effect/core/io/Schedule check
 */
export function check<In, Out>(test: (input: In, output: Out) => boolean) {
  return <State, Env>(self: Schedule<State, Env, In, Out>): Schedule<State, Env, In, Out> =>
    self.checkEffect((in1: In, out) => Effect.sync(test(in1, out)))
}
