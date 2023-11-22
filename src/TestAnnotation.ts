/**
 * @since 2.0.0
 */
import * as Chunk from "./Chunk.js"
import * as Context from "./Context.js"
import * as Either from "./Either.js"
import * as Equal from "./Equal.js"
import type * as Fiber from "./Fiber.js"
import { pipe } from "./Function.js"
import * as Hash from "./Hash.js"
import * as HashSet from "./HashSet.js"
import type * as MutableRef from "./MutableRef.js"
import { hasProperty } from "./Predicate.js"
import type * as SortedSet from "./SortedSet.js"
import type * as Types from "./Types.js"
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

/**
 * @since 2.0.0
 */
export interface TestAnnotation<in out A> extends Equal.Equal {
  readonly [TestAnnotationTypeId]: {
    readonly _A: Types.Invariant<A>
  }
  readonly identifier: string
  readonly tag: Context.Tag<A, A>
  readonly initial: A
  combine(a: A, b: A): A
}

/** @internal */
class TestAnnotationImpl<A> implements Equal.Equal {
  readonly [TestAnnotationTypeId] = {
    _A: (_: any) => _
  }
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
  left: Either.Either<number, Chunk.Chunk<A>>,
  right: Either.Either<number, Chunk.Chunk<A>>
): Either.Either<number, Chunk.Chunk<A>> => {
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
  throw new Error("BUG: TestAnnotation.compose - please report an issue at https://github.com/Effect-TS/effect/issues")
}

/**
 * @since 2.0.0
 */
export const fibers: TestAnnotation<
  Either.Either<
    number,
    Chunk.Chunk<MutableRef.MutableRef<SortedSet.SortedSet<Fiber.RuntimeFiber<unknown, unknown>>>>
  >
> = make(
  "fibers",
  Context.Tag<
    Either.Either<number, Chunk.Chunk<MutableRef.MutableRef<SortedSet.SortedSet<Fiber.RuntimeFiber<unknown, unknown>>>>>
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
export const tagged: TestAnnotation<HashSet.HashSet<string>> = make(
  "tagged",
  Context.Tag<HashSet.HashSet<string>>(Symbol.for("effect/TestAnnotation/tagged")),
  HashSet.empty(),
  (a, b) => pipe(a, HashSet.union(b))
)
