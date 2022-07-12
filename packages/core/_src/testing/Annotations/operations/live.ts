/**
 * Constructs a new `Annotations` service.
 *
 * @tsplus static effect/core/testing/Annotations.Ops live
 */
export const live: Layer<never, never, Annotations> = Layer.scoped(
  Annotations.Tag,
  FiberRef.make(TestAnnotationMap.empty).map((fiberRef): Annotations => ({
    annotate: (key, value) => fiberRef.update((map) => map.annotate(key, value)),
    get: (key) => fiberRef.get().map((map) => map.get(key)),
    supervisedFibers: Effect.descriptorWith((descriptor) =>
      fiberRef.get().map((map) => map.get(TestAnnotation.fibers)).flatMap((either) => {
        switch (either._tag) {
          case "Left": {
            return Effect.succeedNow(SortedSet.empty(Fiber.Ord))
          }
          case "Right": {
            return Effect
              .forEach(either.right, (ref) => Effect.succeed(ref.get))
              .map((chunk) =>
                chunk.reduce(
                  SortedSet.empty(Fiber.Ord),
                  (a, b) => SortedSet.from(Fiber.Ord)(a.concat(b))
                )
              )
              .map((set) => set.filter((fiber) => !(fiber.id == descriptor.id)))
          }
        }
      })
    )
  }))
)
