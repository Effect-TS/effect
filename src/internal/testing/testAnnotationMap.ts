import { dual, pipe } from "../../Function"
import type * as TestAnnotation from "../../internal/testing/testAnnotation"

/** @internal */
export const TestAnnotationMapTypeId = Symbol.for("@effect/test/TestAnnotationMap")

/** @internal */
export type TestAnnotationMapTypeId = typeof TestAnnotationMapTypeId

/**
 * An annotation map keeps track of annotations of different types.
 *
 * @internal
 */
export interface TestAnnotationMap {
  readonly [TestAnnotationMapTypeId]: TestAnnotationMapTypeId
  /** @internal */
  readonly map: ReadonlyMap<TestAnnotation.TestAnnotation<unknown>, unknown>
}

/** @internal */
class TestAnnotationMapImpl implements TestAnnotationMap {
  readonly [TestAnnotationMapTypeId]: TestAnnotationMapTypeId = TestAnnotationMapTypeId
  constructor(readonly map: ReadonlyMap<TestAnnotation.TestAnnotation<unknown>, unknown>) {
  }
}

/** @internal */
export const isTestAnnotationMap = (u: unknown): u is TestAnnotationMap => {
  return typeof u === "object" && u != null && TestAnnotationMapTypeId in u
}

/** @internal */
export const empty: (_: void) => TestAnnotationMap = () => new TestAnnotationMapImpl(new Map())

/** @internal */
export const make = (map: ReadonlyMap<TestAnnotation.TestAnnotation<unknown>, unknown>): TestAnnotationMap => {
  return new TestAnnotationMapImpl(map)
}

/** @internal */
export const overwrite = dual<
  <A>(key: TestAnnotation.TestAnnotation<A>, value: A) => (self: TestAnnotationMap) => TestAnnotationMap,
  <A>(self: TestAnnotationMap, key: TestAnnotation.TestAnnotation<A>, value: A) => TestAnnotationMap
>(3, (self, key, value) =>
  make(
    (self.map as Map<TestAnnotation.TestAnnotation<unknown>, unknown>)
      .set(key as TestAnnotation.TestAnnotation<unknown>, value)
  ))

/** @internal */
export const update = dual<
  <A>(key: TestAnnotation.TestAnnotation<A>, f: (value: A) => A) => (self: TestAnnotationMap) => TestAnnotationMap,
  <A>(self: TestAnnotationMap, key: TestAnnotation.TestAnnotation<A>, f: (value: A) => A) => TestAnnotationMap
>(3, <A>(self: TestAnnotationMap, key: TestAnnotation.TestAnnotation<A>, f: (value: A) => A) => {
  let value = self.map.get(key as TestAnnotation.TestAnnotation<unknown>)
  if (value === undefined) {
    value = key.initial
  }
  return pipe(self, overwrite(key, f(value as A)))
})

/**
 * Retrieves the annotation of the specified type, or its default value if
 * there is none.
 *
 * @internal
 */
export const get = dual<
  <A>(key: TestAnnotation.TestAnnotation<A>) => (self: TestAnnotationMap) => A,
  <A>(self: TestAnnotationMap, key: TestAnnotation.TestAnnotation<A>) => A
>(2, <A>(self: TestAnnotationMap, key: TestAnnotation.TestAnnotation<A>) => {
  const value = self.map.get(key as TestAnnotation.TestAnnotation<unknown>)
  if (value === undefined) {
    return key.initial as A
  }
  return value as A
})

/**
 * Appends the specified annotation to the annotation map.
 *
 * @internal
 */
export const annotate = dual<
  <A>(key: TestAnnotation.TestAnnotation<A>, value: A) => (self: TestAnnotationMap) => TestAnnotationMap,
  <A>(self: TestAnnotationMap, key: TestAnnotation.TestAnnotation<A>, value: A) => TestAnnotationMap
>(3, (self, key, value) => update(self, key, (_) => key.combine(_, value)))

/** @internal */
export const combine = dual<
  (that: TestAnnotationMap) => (self: TestAnnotationMap) => TestAnnotationMap,
  (self: TestAnnotationMap, that: TestAnnotationMap) => TestAnnotationMap
>(2, (self, that) => {
  const result = new Map<TestAnnotation.TestAnnotation<unknown>, unknown>(self.map)
  for (const entry of that.map) {
    if (result.has(entry[0])) {
      const value = result.get(entry[0])!
      result.set(entry[0], entry[0].combine(value, entry[1]))
    } else {
      result.set(entry[0], entry[1])
    }
  }
  return make(result)
})
