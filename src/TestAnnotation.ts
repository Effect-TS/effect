/**
 * @since 2.0.0
 */
import { Chunk } from "./exports/Chunk.js"
import { Context } from "./exports/Context.js"
import { Either } from "./exports/Either.js"
import { Equal } from "./exports/Equal.js"
import type { Fiber } from "./exports/Fiber.js"
import { pipe } from "./exports/Function.js"
import { Hash } from "./exports/Hash.js"
import { HashSet } from "./exports/HashSet.js"
import type { MutableRef } from "./exports/MutableRef.js"
import { hasProperty } from "./exports/Predicate.js"
import type { SortedSet } from "./exports/SortedSet.js"

import type { TestAnnotation } from "./exports/TestAnnotation.js"

/** @internal */
const TestAnnotationSymbolKey = "effect/TestAnnotation"

/**
 * @since 2.0.0
 */
export const TestAnnotationTypeId = Symbol.for(TestAnnotationSymbolKey)

/**
 * @since 2.0.0
 */
export type TestAnnotationTypeId = typeof TestAnnotationTypeId

/** @internal */
class TestAnnotationImpl<A> implements Equal {
  readonly [TestAnnotationTypeId]: TestAnnotationTypeId = TestAnnotationTypeId
  constructor(
    readonly identifier: string,
    readonly tag: Context.Tag<A, A>,
    readonly initial: A,
    readonly combine: (a: A, b: A) => A
  ) {}
  [Hash.symbol](): number {
    return pipe(
      Hash.hash(TestAnnotationSymbolKey),
      Hash.combine(Hash.hash(this.identifier)),
      Hash.combine(Hash.hash(this.tag))
    )
  }
  [Equal.symbol](that: unknown): boolean {
    return isTestAnnotation(that) &&
      this.identifier === that.identifier &&
      Equal.equals(this.tag, that.tag)
  }
}

/**
 * @since 2.0.0
 */
export const isTestAnnotation = (u: unknown): u is TestAnnotation<unknown> => hasProperty(u, TestAnnotationTypeId)

/**
 * @since 2.0.0
 */
export const make = <A>(
  identifier: string,
  tag: Context.Tag<A, A>,
  initial: A,
  combine: (a: A, b: A) => A
): TestAnnotation<A> => {
  return new TestAnnotationImpl(identifier, tag, initial, combine)
}

/**
 * @since 2.0.0
 */
export const compose = <A>(
  left: Either<number, Chunk<A>>,
  right: Either<number, Chunk<A>>
): Either<number, Chunk<A>> => {
  if (Either.isLeft(left) && Either.isLeft(right)) {
    return Either.left(left.left + right.left)
  }
  if (Either.isRight(left) && Either.isRight(right)) {
    return Either.right(pipe(left.right, Chunk.appendAll(right.right)))
  }
  if (Either.isRight(left) && Either.isLeft(right)) {
    return right
  }
  if (Either.isLeft(left) && Either.isRight(right)) {
    return right
  }
  throw new Error("BUG: TestAnnotation.compose - please report an issue at https://github.com/Effect-TS/io/issues")
}

/**
 * @since 2.0.0
 */
export const fibers: TestAnnotation<
  Either<
    number,
    Chunk<MutableRef<SortedSet<Fiber.RuntimeFiber<unknown, unknown>>>>
  >
> = make(
  "fibers",
  Context.Tag<
    Either<number, Chunk<MutableRef<SortedSet<Fiber.RuntimeFiber<unknown, unknown>>>>>
  >(),
  Either.left(0),
  compose
)

/**
 * An annotation which counts ignored tests.
 *
 * @since 2.0.0
 */
export const ignored: TestAnnotation<number> = make(
  "ignored",
  Context.Tag<number>(Symbol.for("effect/TestAnnotation/ignored")),
  0,
  (a, b) => a + b
)

/**
 * An annotation which counts repeated tests.
 *
 * @since 2.0.0
 */
export const repeated: TestAnnotation<number> = make(
  "repeated",
  Context.Tag<number>(Symbol.for("effect/TestAnnotation/repeated")),
  0,
  (a, b) => a + b
)

/**
 * An annotation which counts retried tests.
 *
 * @since 2.0.0
 */
export const retried: TestAnnotation<number> = make(
  "retried",
  Context.Tag<number>(Symbol.for("effect/TestAnnotation/retired")),
  0,
  (a, b) => a + b
)

/**
 * An annotation which tags tests with strings.
 *
 * @since 2.0.0
 */
export const tagged: TestAnnotation<HashSet<string>> = make(
  "tagged",
  Context.Tag<HashSet<string>>(Symbol.for("effect/TestAnnotation/tagged")),
  HashSet.empty(),
  (a, b) => pipe(a, HashSet.union(b))
)
