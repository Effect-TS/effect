/**
 * Squashes a `Cause` down to a single defect, chosen to be the "most
 * important" defect.
 *
 * @tsplus static effect/core/io/Cause.Aspects squashWith
 * @tsplus pipeable effect/core/io/Cause squashWith
 */
export function squashWith<E>(f: (e: E) => unknown) {
  return (self: Cause<E>): unknown =>
    self
      .failureMaybe
      .map(f)
      .getOrElse(() => {
        if (self.isInterrupted) {
          const fibers = self.interruptors.flatMap((fiberId) => fiberId.ids.map((n) => `#${n}`))
            .reduce(
              "",
              (acc, id) => `${acc}, ${id}`
            )
          return new InterruptedException(`Interrupted by fibers: ${fibers}`)
        }
        return self.defects.head.getOrElse(new InterruptedException())
      })
}
