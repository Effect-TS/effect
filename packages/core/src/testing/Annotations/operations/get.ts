/**
 * Accesses an `Annotations` instance in the environment and retrieves the
 * annotation of the specified type, or its default value if there is none.
 *
 * @tsplus static effect/core/testing/Annotations.Ops get
 * @category mutations
 * @since 1.0.0
 */
export function get<V>(key: TestAnnotation<V>): Effect<Annotations, never, V> {
  return Effect.serviceWithEffect(
    Annotations.Tag,
    (annotations) => annotations.get(key)
  )
}
