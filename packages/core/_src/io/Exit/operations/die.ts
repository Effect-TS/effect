/**
 * @tsplus static effect/core/io/Exit.Ops die
 */
export function die(defect: unknown): Exit<never, never> {
  return Exit.failCause(Cause.die(defect))
}
