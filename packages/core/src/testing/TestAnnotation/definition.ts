export const TestAnnotationSym = Symbol.for("@effect/core/testing/TestAnnotation")
export type TestAnnotationSym = typeof TestAnnotationSym

/**
 * A type of annotation.
 *
 * @tsplus type effect/core/testing/TestAnnotation
 * @tsplus companion effect/core/testing/TestAnnotation.Ops
 */
export class TestAnnotation<V> implements Equals {
  readonly [TestAnnotationSym]: TestAnnotationSym = TestAnnotationSym

  constructor(
    readonly identifier: string,
    readonly initial: V,
    readonly combine: (a: V, b: V) => V,
    readonly tag: Tag<V>
  ) {}

  [Hash.sym](): number {
    return Hash.combine(Hash.string(this.identifier), Hash.unknown(this.tag))
  }

  [Equals.sym](that: unknown) {
    return TestAnnotation.is(that) &&
      this.identifier === that.identifier &&
      Equals.equals(this.tag, that.tag)
  }
}

/**
 * @tsplus static effect/core/testing/TestAnnotation.Ops is
 */
export function isTestAnnotation(u: unknown): u is TestAnnotation<unknown> {
  return typeof u === "object" && u != null && TestAnnotationSym in u
}
