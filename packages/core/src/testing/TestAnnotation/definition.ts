import type { Tag } from "@fp-ts/data/Context"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"

const TestAnnotationSymbolKey = "@effect/core/testing/TestAnnotation"

/**
 * @category symbol
 * @since 1.0.0
 */
export const TestAnnotationSym = Symbol.for(TestAnnotationSymbolKey)

/**
 * @category symbol
 * @since 1.0.0
 */
export type TestAnnotationSym = typeof TestAnnotationSym

/**
 * A type of annotation.
 *
 * @tsplus type effect/core/testing/TestAnnotation
 * @tsplus companion effect/core/testing/TestAnnotation.Ops
 * @category model
 * @since 1.0.0
 */
export class TestAnnotation<V> implements Equal.Equal {
  readonly [TestAnnotationSym]: TestAnnotationSym = TestAnnotationSym

  constructor(
    readonly identifier: string,
    readonly initial: V,
    readonly combine: (a: V, b: V) => V,
    readonly tag: Tag<V>
  ) {}

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(TestAnnotationSymbolKey),
      Equal.hashCombine(Equal.hash(this.identifier)),
      Equal.hashCombine(Equal.hash(this.tag))
    )
  }

  [Equal.symbolEqual](that: unknown) {
    return TestAnnotation.is(that) &&
      this.identifier === that.identifier &&
      Equal.equals(this.tag, that.tag)
  }
}

/**
 * @tsplus static effect/core/testing/TestAnnotation.Ops is
 * @category guards
 * @since 1.0.0
 */
export function isTestAnnotation(u: unknown): u is TestAnnotation<unknown> {
  return typeof u === "object" && u != null && TestAnnotationSym in u
}
