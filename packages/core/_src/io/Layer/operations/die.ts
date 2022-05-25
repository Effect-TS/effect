/**
 * Constructs a layer that dies with the specified throwable.
 *
 * @tsplus static ets/Layer/Ops die
 */
export function die(defect: LazyArg<unknown>): Layer<unknown, never, never> {
  return Layer.failCause(Cause.die(defect()))
}
