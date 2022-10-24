import * as Chunk from "@fp-ts/data/Chunk"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
import * as SortedSet from "@fp-ts/data/SortedSet"

/**
 * Constructs a new `Annotations` service.
 *
 * @tsplus static effect/core/testing/Annotations.Ops live
 * @category environment
 * @since 1.0.0
 */
export const live: Layer<never, never, Annotations> = Layer.scoped(
  Annotations.Tag,
  FiberRef.make(TestAnnotationMap.empty).map((fiberRef): Annotations => ({
    annotate: (key, value) => fiberRef.update((map) => map.annotate(key, value)),
    get: (key) => fiberRef.get.map((map) => map.get(key)),
    supervisedFibers: Effect.descriptorWith((descriptor) =>
      fiberRef.get.map((map) => map.get(TestAnnotation.fibers)).flatMap((either) => {
        switch (either._tag) {
          case "Left": {
            return Effect.succeed(SortedSet.empty(Fiber.Order))
          }
          case "Right": {
            return Effect
              .forEach(either.right, (ref) => Effect.sync(MutableRef.get(ref)))
              .map(Chunk.reduce(
                SortedSet.empty(Fiber.Order),
                (a, b) => pipe(a, SortedSet.union(b))
              ))
              .map(SortedSet.filter((fiber) => !Equal.equals(fiber.id, descriptor.id)))
          }
        }
      })
    )
  }))
)
