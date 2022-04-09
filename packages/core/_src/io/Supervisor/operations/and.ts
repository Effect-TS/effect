/**
 * Returns a new supervisor that performs the function of this supervisor, and
 * the function of the specified supervisor, producing a tuple of the outputs
 * produced by both supervisors.
 *
 * @tsplus operator ets/Supervisor +
 * @tsplus fluent ets/Supervisor and
 */
export function and_<A, B>(
  self: Supervisor<A>,
  that: Supervisor<B>
): Supervisor<Tuple<[A, B]>> {
  return new Supervisor(
    self.value.zip(that.value),
    (environment, effect, parent, fiber) => {
      try {
        self.unsafeOnStart(environment, effect, parent, fiber);
      } finally {
        that.unsafeOnStart(environment, effect, parent, fiber);
      }
    },
    (exit, fiber) => {
      self.unsafeOnEnd(exit, fiber);
      that.unsafeOnEnd(exit, fiber);
    },
    (fiber, effect) => {
      self.unsafeOnEffect(fiber, effect);
      that.unsafeOnEffect(fiber, effect);
    },
    (fiber) => {
      self.unsafeOnSuspend(fiber);
      that.unsafeOnSuspend(fiber);
    },
    (fiber) => {
      self.unsafeOnSuspend(fiber);
      that.unsafeOnSuspend(fiber);
    }
  );
}

/**
 * Returns a new supervisor that performs the function of this supervisor, and
 * the function of the specified supervisor, producing a tuple of the outputs
 * produced by both supervisors.
 */
export const and = Pipeable(and_);
