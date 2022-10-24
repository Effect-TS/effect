/**
 * Constructs a layer that dies with the specified throwable.
 *
 * @tsplus static effect/core/io/Layer.Ops die
 * @category constructors
 * @since 1.0.0
 */
export function die(defect: LazyArg<unknown>): Layer<never, never, unknown> {
  return Layer.failCause(Cause.die(defect()))
}
