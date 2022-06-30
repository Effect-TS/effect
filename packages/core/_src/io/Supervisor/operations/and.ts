/**
 * Returns a new supervisor that performs the function of this supervisor, and
 * the function of the specified supervisor, producing a tuple of the outputs
 * produced by both supervisors.
 *
 * @tsplus pipeable-operator effect/core/io/Supervisor +
 * @tsplus static effect/core/io/Supervisor.Aspects and
 * @tsplus pipeable effect/core/io/Supervisor and
 */
export function and<A, B>(that: Supervisor<B>) {
  return (self: Supervisor<A>): Supervisor<Tuple<[A, B]>> =>
    new Supervisor(
      self.value.zip(that.value),
      (environment, effect, parent, fiber) => {
        try {
          self.unsafeOnStart(environment, effect, parent, fiber)
        } finally {
          that.unsafeOnStart(environment, effect, parent, fiber)
        }
      },
      (exit, fiber) => {
        self.unsafeOnEnd(exit, fiber)
        that.unsafeOnEnd(exit, fiber)
      },
      (fiber, effect) => {
        self.unsafeOnEffect(fiber, effect)
        that.unsafeOnEffect(fiber, effect)
      },
      (fiber) => {
        self.unsafeOnSuspend(fiber)
        that.unsafeOnSuspend(fiber)
      },
      (fiber) => {
        self.unsafeOnSuspend(fiber)
        that.unsafeOnSuspend(fiber)
      }
    )
}
