// ets_tracing: off

import * as Chunk from "../../Collections/Immutable/Chunk/index.js"
import * as SortedSet from "../../Collections/Immutable/SortedSet/index.js"
import * as Tuple from "../../Collections/Immutable/Tuple/index.js"
import * as T from "../../Effect/index.js"
import type * as Fiber from "../../Fiber/index.js"
import * as FiberRef from "../../FiberRef/index.js"
import { pipe } from "../../Function/index.js"
import { tag } from "../../Has/index.js"
import * as L from "../../Layer/index.js"
import * as St from "../../Structural/index.js"
import { fiberSet } from "../FiberSet/index.js"
import * as TestAnnotation from "../TestAnnotation/index.js"
import * as TAM from "../TestAnnotationMap/index.js"

/**
 * An `Annotated[A]` contains a value of type `A` along with zero or more
 * test annotations.
 */
export type Annotated<A> = Tuple.Tuple<[A, TAM.TestAnnotationMap]>

export const AnnotationsId = Symbol()

/**
 * The `Annotations` trait provides access to an annotation map that tests
 * can add arbitrary annotations to. Each annotation consists of a string
 * identifier, an initial value, and a function for combining two values.
 * Annotations form monoids and you can think of `Annotations` as a more
 * structured logging service or as a super polymorphic version of the writer
 * monad effect.
 */
export interface Annotations {
  readonly serviceId: typeof AnnotationsId

  readonly annotate: <V>(key: TestAnnotation.TestAnnotation<V>, value: V) => T.UIO<void>

  readonly get: <V>(key: TestAnnotation.TestAnnotation<V>) => T.UIO<V>

  readonly withAnnotation: <R, E, A>(
    self: T.Effect<R, E, A>
  ) => T.Effect<R, Annotated<E>, Annotated<A>>

  readonly supervisedFibers: T.UIO<SortedSet.SortedSet<Fiber.Runtime<unknown, unknown>>>
}

/**
 * Tag for the Annotations service
 */
export const Annotations = tag<Annotations>(AnnotationsId)

/**
 * Constructs a new `Annotations` service.
 */
export const live = L.fromEffect(Annotations)(
  T.gen(function* (_) {
    const fiberRef = yield* _(FiberRef.make(TAM.TestAnnotationMap.empty))

    const annotate: <V>(
      key: TestAnnotation.TestAnnotation<V>,
      value: V
    ) => T.UIO<void> = (key, value) =>
      pipe(fiberRef, FiberRef.update(TAM.annotate(key, value)))

    const get: <V>(key: TestAnnotation.TestAnnotation<V>) => T.UIO<V> = (key) =>
      pipe(fiberRef, FiberRef.get, T.map(TAM.get(key)))

    const withAnnotation: <R, E, A>(
      self: T.Effect<R, E, A>
    ) => T.Effect<R, Annotated<E>, Annotated<A>> = (effect) =>
      pipe(
        effect,
        T.foldM(
          (e) =>
            pipe(
              fiberRef,
              FiberRef.get,
              T.map((_) => Tuple.tuple(e, _)),
              T.flip
            ),
          (a) =>
            pipe(
              fiberRef,
              FiberRef.get,
              T.map((_) => Tuple.tuple(a, _))
            )
        ),
        FiberRef.locally_(fiberRef, TAM.TestAnnotationMap.empty)
      )

    const supervisedFibers = T.descriptorWith((d) =>
      pipe(
        get(TestAnnotation.fibers),
        T.chain((fa) => {
          switch (fa._tag) {
            case "Left": {
              return T.succeed(fiberSet)
            }
            case "Right": {
              return pipe(
                fa.right,
                T.forEach((ref) => T.succeedWith(() => ref.get)),
                T.map(Chunk.reduce(fiberSet, SortedSet.union_)),
                T.map(SortedSet.filter((_) => !St.equals(_.id, d.id)))
              )
            }
          }
        })
      )
    )

    const annotations: Annotations = {
      serviceId: AnnotationsId,
      annotate,
      get,
      supervisedFibers,
      withAnnotation
    }

    return annotations
  })
)

/**
 * Accesses an `Annotations` instance in the environment and executes the
 * specified effect with an empty annotation map, returning the annotation
 * map along with the result of execution.
 */
export function withAnnotation<R, E, A>(effect: T.Effect<R, E, A>) {
  return T.accessServiceM(Annotations)((_) => _.withAnnotation(effect))
}

/**
 * Accesses an `Annotations` instance in the environment and appends the
 * specified annotation to the annotation map.
 */
export function annotate<V>(key: TestAnnotation.TestAnnotation<V>, value: V) {
  return T.accessServiceM(Annotations)((_) => _.annotate(key, value))
}

/**
 * Accesses an `Annotations` instance in the environment and retrieves the
 * annotation of the specified type, or its default value if there is none.
 */
export function get<V>(key: TestAnnotation.TestAnnotation<V>) {
  return T.accessServiceM(Annotations)((_) => _.get(key))
}

/**
 * Returns a set of all fibers in this test.
 */
export const supervisedFibers = T.accessServiceM(Annotations)((_) => _.supervisedFibers)
