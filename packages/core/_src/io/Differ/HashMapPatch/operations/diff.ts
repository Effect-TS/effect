import {
  AddHashMapPatch,
  HashMapPatch,
  RemoveHashMapPatch,
  UpdateHashMapPatch
} from "@effect/core/io/Differ/HashMapPatch/definition"

/**
 * Constructs a map patch from a new and old map of keys and values and a
 * differ for the values.
 *
 * @tsplus static effect/core/io/Differ.HashMapPatch.Ops diff
 */
export function diff<Key, Value, Patch>(
  oldValue: HashMap<Key, Value>,
  newValue: HashMap<Key, Value>,
  differ: Differ<Value, Patch>
): HashMapPatch<Key, Value, Patch> {
  const { tuple: [removed, patch] } = newValue.reduceWithIndex(
    Tuple(oldValue, HashMapPatch.empty<Key, Value, Patch>()),
    ({ tuple: [map, patch] }, key, newValue) => {
      const maybe = map.get(key)
      switch (maybe._tag) {
        case "Some": {
          const valuePatch = differ.diff(maybe.value, newValue)
          if (Equals.equals(valuePatch, differ.empty)) {
            return Tuple(map.remove(key), patch)
          }
          return Tuple(map.remove(key), patch.combine(new UpdateHashMapPatch(key, valuePatch)))
        }
        case "None": {
          return Tuple(map.remove(key), patch.combine(new AddHashMapPatch(key, newValue)))
        }
      }
    }
  )
  return removed.reduceWithIndex(
    patch,
    (patch, key, _) => patch.combine(new RemoveHashMapPatch(key))
  )
}
