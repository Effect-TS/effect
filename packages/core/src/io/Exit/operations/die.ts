/**
 * @tsplus static effect/core/io/Exit.Ops die
 * @category constructors
 * @since 1.0.0
 */
export function die(defect: unknown): Exit<never, never> {
  return Exit.failCause(Cause.die(defect))
}
