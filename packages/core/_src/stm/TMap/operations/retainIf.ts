/**
 * Retains bindings matching predicate and returns removed bindings.
 *
 * @tsplus fluent ets/TMap retainIf
 */
export function retainIf_<K, V>(self: TMap<K, V>, f: (kv: Tuple<[K, V]>) => boolean): USTM<Chunk<Tuple<[K, V]>>> {
  return self.removeIf((_) => !f(_))
}

/**
 * Retains bindings matching predicate and returns removed bindings.
 *
 * @tsplus static ets/TMap/Aspects retainIf
 */
export const retainIf = Pipeable(retainIf_)
