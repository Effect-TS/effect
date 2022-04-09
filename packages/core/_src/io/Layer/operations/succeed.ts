/**
 * Constructs a layer from the specified value.
 *
 * @tsplus static ets/Layer/Ops succeed
 */
export function succeed<T>(resource: LazyArg<T>): Layer<unknown, never, T> {
  return Layer.fromRawEffect(Effect.succeed(resource));
}
