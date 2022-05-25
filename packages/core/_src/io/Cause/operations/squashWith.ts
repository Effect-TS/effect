/**
 * Squashes a `Cause` down to a single defect, chosen to be the "most
 * important" defect.
 *
 * @tsplus fluent ets/Cause squashWith
 */
export function squashWith_<E>(self: Cause<E>, f: (e: E) => unknown): unknown {
  return self
    .failureOption()
    .map(f)
    .getOrElse(() => {
      if (self.isInterrupted()) {
        const fibers = self.interruptors().flatMap((fiberId) => fiberId.ids().map((n) => `#${n}`)).reduce(
          "",
          (acc, id) => `${acc}, ${id}`
        )
        return new InterruptedException(`Interrupted by fibers: ${fibers}`)
      }
      return self.defects().head().getOrElse(new InterruptedException())
    })
}

/**
 * Squashes a `Cause` down to a single defect, chosen to be the "most
 * important" defect.
 *
 * @tsplus static ets/Cause/Aspects squashWith
 */
export const squashWith = Pipeable(squashWith_)
