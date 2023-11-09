/**
 * @since 2.0.0
 */
import { Context } from "./exports/Context.js"
import type { Effect } from "./exports/Effect.js"
import { Equal } from "./exports/Equal.js"
import type { Fiber } from "./exports/Fiber.js"
import { pipe } from "./exports/Function.js"
import { MutableRef } from "./exports/MutableRef.js"
import { hasProperty } from "./exports/Predicate.js"
import { ReadonlyArray as RA } from "./exports/ReadonlyArray.js"
import { Ref } from "./exports/Ref.js"
import { SortedSet } from "./exports/SortedSet.js"
import { TestAnnotation } from "./exports/TestAnnotation.js"
import { TestAnnotationMap } from "./exports/TestAnnotationMap.js"
import type { TestAnnotations } from "./exports/TestAnnotations.js"
import * as effect from "./internal/core-effect.js"
import * as core from "./internal/core.js"
import * as fiber from "./internal/fiber.js"

/**
 * @since 2.0.0
 */
export const TestAnnotationsTypeId = Symbol.for("effect/TestAnnotations")

/**
 * @since 2.0.0
 */
export type TestAnnotationsTypeId = typeof TestAnnotationsTypeId

/** @internal */
class AnnotationsImpl implements TestAnnotations {
  readonly [TestAnnotationsTypeId]: TestAnnotationsTypeId = TestAnnotationsTypeId
  constructor(readonly ref: Ref<TestAnnotationMap>) {
  }
  get<A>(key: TestAnnotation<A>): Effect<never, never, A> {
    return core.map(Ref.get(this.ref), TestAnnotationMap.get(key))
  }
  annotate<A>(key: TestAnnotation<A>, value: A): Effect<never, never, void> {
    return Ref.update(this.ref, TestAnnotationMap.annotate(key, value))
  }
  supervisedFibers(): Effect<never, never, SortedSet<Fiber.RuntimeFiber<unknown, unknown>>> {
    return effect.descriptorWith((descriptor) =>
      core.flatMap(this.get(TestAnnotation.fibers), (either) => {
        switch (either._tag) {
          case "Left": {
            return core.succeed(SortedSet.empty(fiber.Order))
          }
          case "Right": {
            return pipe(
              either.right,
              core.forEachSequential((ref) => core.sync(() => MutableRef.get(ref))),
              core.map(RA.reduce(SortedSet.empty(fiber.Order), (a, b) => SortedSet.union(a, b))),
              core.map(SortedSet.filter((fiber) => !Equal.equals(fiber.id(), descriptor.id)))
            )
          }
        }
      })
    )
  }
}

/**
 * @since 2.0.0
 */
export const Tag: Context.Tag<TestAnnotations, TestAnnotations> = Context.Tag<TestAnnotations>(
  Symbol.for("effect/Annotations")
)

/**
 * @since 2.0.0
 */
export const isTestAnnotations = (u: unknown): u is TestAnnotations => hasProperty(u, TestAnnotationsTypeId)

/**
 * @since 2.0.0
 */
export const make = (
  ref: Ref<TestAnnotationMap>
): TestAnnotations => new AnnotationsImpl(ref)
