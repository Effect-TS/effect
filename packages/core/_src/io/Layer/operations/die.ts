/**
 * Constructs a layer that dies with the specified throwable.
 *
 * @tsplus static ets/Layer/Ops die
 */
export function die(defect: LazyArg<unknown>): Layer<never, never, unknown> {
  return Layer.failCause(Cause.die(defect()))
}
