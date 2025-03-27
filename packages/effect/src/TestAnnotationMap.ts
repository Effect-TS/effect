/**
 * @since 2.0.0
 */
import { dual } from "./Function.js"
import * as HashMap from "./HashMap.js"
import { hasProperty } from "./Predicate.js"
import type * as TestAnnotation from "./TestAnnotation.js"

/**
 * @since 2.0.0
 */
export const TestAnnotationMapTypeId: unique symbol = Symbol.for("effect/TestAnnotationMap")

/**
 * @since 2.0.0
 */
export type TestAnnotationMapTypeId = typeof TestAnnotationMapTypeId

/**
 * An annotation map keeps track of annotations of different types.
 *
 * @since 2.0.0
 */
export interface TestAnnotationMap {
  readonly [TestAnnotationMapTypeId]: TestAnnotationMapTypeId
  /** @internal */
  readonly map: HashMap.HashMap<TestAnnotation.TestAnnotation<any>, any>
}

/** @internal */
class TestAnnotationMapImpl implements TestAnnotationMap {
  readonly [TestAnnotationMapTypeId]: TestAnnotationMapTypeId = TestAnnotationMapTypeId
  constructor(readonly map: HashMap.HashMap<TestAnnotation.TestAnnotation<any>, any>) {
  }
}

/**
 * @since 2.0.0
 */
export const isTestAnnotationMap = (u: unknown): u is TestAnnotationMap => hasProperty(u, TestAnnotationMapTypeId)

/**
 * @since 2.0.0
 */
export const empty: (_: void) => TestAnnotationMap = () => new TestAnnotationMapImpl(HashMap.empty())

/**
 * @since 2.0.0
 */
export const make = (map: HashMap.HashMap<TestAnnotation.TestAnnotation<any>, any>): TestAnnotationMap => {
  return new TestAnnotationMapImpl(map)
}

/**
 * @since 2.0.0
 */
export const overwrite = dual<
  <A>(key: TestAnnotation.TestAnnotation<A>, value: A) => (self: TestAnnotationMap) => TestAnnotationMap,
  <A>(self: TestAnnotationMap, key: TestAnnotation.TestAnnotation<A>, value: A) => TestAnnotationMap
>(3, (self, key, value) => make(HashMap.set(self.map, key, value)))

/**
 * @since 2.0.0
 */
export const update = dual<
  <A>(key: TestAnnotation.TestAnnotation<A>, f: (value: A) => A) => (self: TestAnnotationMap) => TestAnnotationMap,
  <A>(self: TestAnnotationMap, key: TestAnnotation.TestAnnotation<A>, f: (value: A) => A) => TestAnnotationMap
>(3, <A>(self: TestAnnotationMap, key: TestAnnotation.TestAnnotation<A>, f: (value: A) => A) => {
  let value = key.initial
  if (HashMap.has(self.map, key)) {
    value = HashMap.unsafeGet(self.map, key) as A
  }
  return overwrite(self, key, f(value))
})

/**
 * Retrieves the annotation of the specified type, or its default value if
 * there is none.
 *
 * @since 2.0.0
 */
export const get = dual<
  <A>(key: TestAnnotation.TestAnnotation<A>) => (self: TestAnnotationMap) => A,
  <A>(self: TestAnnotationMap, key: TestAnnotation.TestAnnotation<A>) => A
>(2, <A>(self: TestAnnotationMap, key: TestAnnotation.TestAnnotation<A>) => {
  if (HashMap.has(self.map, key)) {
    return HashMap.unsafeGet(self.map, key) as A
  }
  return key.initial
})

/**
 * Appends the specified annotation to the annotation map.
 *
 * @since 2.0.0
 */
export const annotate = dual<
  <A>(key: TestAnnotation.TestAnnotation<A>, value: A) => (self: TestAnnotationMap) => TestAnnotationMap,
  <A>(self: TestAnnotationMap, key: TestAnnotation.TestAnnotation<A>, value: A) => TestAnnotationMap
>(3, (self, key, value) => update(self, key, (_) => key.combine(_, value)))

/**
 * @since 2.0.0
 */
export const combine = dual<
  (that: TestAnnotationMap) => (self: TestAnnotationMap) => TestAnnotationMap,
  (self: TestAnnotationMap, that: TestAnnotationMap) => TestAnnotationMap
>(2, (self, that) => {
  let result = self.map
  for (const entry of that.map) {
    if (HashMap.has(result, entry[0])) {
      const value = HashMap.get(result, entry[0])!
      result = HashMap.set(result, entry[0], entry[0].combine(value, entry[1]))
    } else {
      result = HashMap.set(result, entry[0], entry[1])
    }
  }
  return make(result)
})
