import { Exited, Running } from "@effect/core/io/Scope/ReleaseMap/_internal/State";
/**
 * Removes the finalizer associated with this key and returns it.
 *
 * @tsplus fluent ets/ReleaseMap remove
 */
export function remove_(
  self: ReleaseMap,
  key: number,
  __tsplusTrace?: string
): UIO<Option<Scope.Finalizer>> {
  return self.ref.modify((s) => {
    switch (s._tag) {
      case "Exited": {
        return Tuple(Option.none, new Exited(s.nextKey, s.exit, s.update));
      }
      case "Running": {
        const finalizers = s.finalizers();
        const finalizer = Option.fromNullable(finalizers.get(key));
        finalizers.delete(key);
        return Tuple(finalizer, new Running(s.nextKey, finalizers, s.update));
      }
    }
  });
}

/**
 * Removes the finalizer associated with this key and returns it.
 */
export const remove = Pipeable(remove_);
