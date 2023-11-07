/**
 * @since 2.0.0
 */
import { dual, pipe } from "../Function.js"
import { hasProperty } from "../Predicate.js"
import type { TestAnnotation } from "../TestAnnotation.js"

import type { TestAnnotationMap } from "../TestAnnotationMap.js"

/**
 * @since 2.0.0
 */
export const TestAnnotationMapTypeId = Symbol.for("effect/TestAnnotationMap")

/**
 * @since 2.0.0
 */
export type TestAnnotationMapTypeId = typeof TestAnnotationMapTypeId

/** @internal */
class TestAnnotationMapImpl implements TestAnnotationMap {
  readonly [TestAnnotationMapTypeId]: TestAnnotationMapTypeId = TestAnnotationMapTypeId
  constructor(readonly map: ReadonlyMap<TestAnnotation<unknown>, unknown>) {
  }
}

/**
 * @since 2.0.0
 */
export const isTestAnnotationMap = (u: unknown): u is TestAnnotationMap => hasProperty(u, TestAnnotationMapTypeId)

/**
 * @since 2.0.0
 */
export const empty: (_: void) => TestAnnotationMap = () => new TestAnnotationMapImpl(new Map())

/**
 * @since 2.0.0
 */
export const make = (map: ReadonlyMap<TestAnnotation<unknown>, unknown>): TestAnnotationMap => {
  return new TestAnnotationMapImpl(map)
}

/**
 * @since 2.0.0
 */
export const overwrite = dual<
  <A>(key: TestAnnotation<A>, value: A) => (self: TestAnnotationMap) => TestAnnotationMap,
  <A>(self: TestAnnotationMap, key: TestAnnotation<A>, value: A) => TestAnnotationMap
>(3, (self, key, value) =>
  make(
    (self.map as Map<TestAnnotation<unknown>, unknown>)
      .set(key as TestAnnotation<unknown>, value)
  ))

/**
 * @since 2.0.0
 */
export const update = dual<
  <A>(key: TestAnnotation<A>, f: (value: A) => A) => (self: TestAnnotationMap) => TestAnnotationMap,
  <A>(self: TestAnnotationMap, key: TestAnnotation<A>, f: (value: A) => A) => TestAnnotationMap
>(3, <A>(self: TestAnnotationMap, key: TestAnnotation<A>, f: (value: A) => A) => {
  let value = self.map.get(key as TestAnnotation<unknown>)
  if (value === undefined) {
    value = key.initial
  }
  return pipe(self, overwrite(key, f(value as A)))
})

/**
 * Retrieves the annotation of the specified type, or its default value if
 * there is none.
 *
 * @since 2.0.0
 */
export const get = dual<
  <A>(key: TestAnnotation<A>) => (self: TestAnnotationMap) => A,
  <A>(self: TestAnnotationMap, key: TestAnnotation<A>) => A
>(2, <A>(self: TestAnnotationMap, key: TestAnnotation<A>) => {
  const value = self.map.get(key as TestAnnotation<unknown>)
  if (value === undefined) {
    return key.initial as A
  }
  return value as A
})

/**
 * Appends the specified annotation to the annotation map.
 *
 * @since 2.0.0
 */
export const annotate = dual<
  <A>(key: TestAnnotation<A>, value: A) => (self: TestAnnotationMap) => TestAnnotationMap,
  <A>(self: TestAnnotationMap, key: TestAnnotation<A>, value: A) => TestAnnotationMap
>(3, (self, key, value) => update(self, key, (_) => key.combine(_, value)))

/**
 * @since 2.0.0
 */
export const combine = dual<
  (that: TestAnnotationMap) => (self: TestAnnotationMap) => TestAnnotationMap,
  (self: TestAnnotationMap, that: TestAnnotationMap) => TestAnnotationMap
>(2, (self, that) => {
  const result = new Map<TestAnnotation<unknown>, unknown>(self.map)
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
