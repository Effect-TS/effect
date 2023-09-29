/**
 * @since 2.0.0
 */
import * as Context from "./Context"
import type * as Effect from "./Effect"
import * as Equal from "./Equal"
import type * as Fiber from "./Fiber"
import { pipe } from "./Function"
import * as core from "./internal/core"
import * as effect from "./internal/core-effect"
import * as fiber from "./internal/fiber"
import * as MutableRef from "./MutableRef"
import * as RA from "./ReadonlyArray"
import * as Ref from "./Ref"
import * as SortedSet from "./SortedSet"
import * as TestAnnotation from "./TestAnnotation"
import * as TestAnnotationMap from "./TestAnnotationMap"

/**
 * @since 2.0.0
 */
export const TestAnnotationsTypeId = Symbol.for("effect/TestAnnotations")

/**
 * @since 2.0.0
 */
export type TestAnnotationsTypeId = typeof TestAnnotationsTypeId

/**
 * The `Annotations` trait provides access to an annotation map that tests can
 * add arbitrary annotations to. Each annotation consists of a string
 * identifier, an initial value, and a function for combining two values.
 * Annotations form monoids and you can think of `Annotations` as a more
 * structured logging service or as a super polymorphic version of the writer
 * monad effect.
 *
 * @since 2.0.0
 */
export interface TestAnnotations {
  readonly [TestAnnotationsTypeId]: TestAnnotationsTypeId

  readonly ref: Ref.Ref<TestAnnotationMap.TestAnnotationMap>

  /**
   * Accesses an `Annotations` instance in the context and retrieves the
   * annotation of the specified type, or its default value if there is none.
   */
  get<A>(key: TestAnnotation.TestAnnotation<A>): Effect.Effect<never, never, A>

  /**
   * Accesses an `Annotations` instance in the context and appends the
   * specified annotation to the annotation map.
   */
  annotate<A>(key: TestAnnotation.TestAnnotation<A>, value: A): Effect.Effect<never, never, void>

  /**
   * Returns the set of all fibers in this test.
   */
  supervisedFibers(): Effect.Effect<never, never, SortedSet.SortedSet<Fiber.RuntimeFiber<unknown, unknown>>>
}

/** @internal */
class AnnotationsImpl implements TestAnnotations {
  readonly [TestAnnotationsTypeId]: TestAnnotationsTypeId = TestAnnotationsTypeId
  constructor(readonly ref: Ref.Ref<TestAnnotationMap.TestAnnotationMap>) {
  }
  get<A>(key: TestAnnotation.TestAnnotation<A>): Effect.Effect<never, never, A> {
    return core.map(Ref.get(this.ref), TestAnnotationMap.get(key))
  }
  annotate<A>(key: TestAnnotation.TestAnnotation<A>, value: A): Effect.Effect<never, never, void> {
    return Ref.update(this.ref, TestAnnotationMap.annotate(key, value))
  }
  supervisedFibers(): Effect.Effect<never, never, SortedSet.SortedSet<Fiber.RuntimeFiber<unknown, unknown>>> {
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
export const TestAnnotations: Context.Tag<TestAnnotations, TestAnnotations> = Context.Tag<TestAnnotations>(
  Symbol.for("effect/Annotations")
)

/**
 * @since 2.0.0
 */
export const isTestAnnotations = (u: unknown): u is TestAnnotations => {
  return typeof u === "object" && u != null && TestAnnotationsTypeId in u
}

/**
 * @since 2.0.0
 */
export const make = (
  ref: Ref.Ref<TestAnnotationMap.TestAnnotationMap>
): TestAnnotations => new AnnotationsImpl(ref)
