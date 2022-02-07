// ets_tracing: off

import * as HashMap from "../../Collections/Immutable/HashMap/index.js"
import * as L from "../../Collections/Immutable/List/index.js"
import type { Endomorphism } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import type * as TestAnnotation from "../TestAnnotation/index.js"

export class TestAnnotationMap {
  static empty = new TestAnnotationMap(HashMap.make())

  constructor(
    readonly map: HashMap.HashMap<TestAnnotation.TestAnnotation<unknown>, unknown>
  ) {}
}

export function concat(self: TestAnnotationMap, that: TestAnnotationMap) {
  const l = L.from(self.map)
  const r = L.from(that.map)

  return new TestAnnotationMap(
    L.reduce_(L.concat_(l, r), TestAnnotationMap.empty.map, (acc, [key, value]) =>
      HashMap.set_(
        acc,
        key,
        O.fold_(
          HashMap.get_(acc, key),
          () => value,
          (x) => key.combine(x, value)
        )
      )
    )
  )
}

export function get<V>(key: TestAnnotation.TestAnnotation<V>) {
  return (tam: TestAnnotationMap) =>
    O.fold_(
      HashMap.get_(tam.map, key as any),
      () => key.initial,
      (a) => a as V
    )
}

export function overwrite<V>(key: TestAnnotation.TestAnnotation<V>, value: V) {
  return (tam: TestAnnotationMap) =>
    new TestAnnotationMap(HashMap.set_(tam.map, key as any, value))
}

export function update<V>(key: TestAnnotation.TestAnnotation<V>, f: Endomorphism<V>) {
  return (tam: TestAnnotationMap) => overwrite(key, f(get(key)(tam)))(tam)
}

export function annotate<V>(key: TestAnnotation.TestAnnotation<V>, value: V) {
  return (tam: TestAnnotationMap) => update(key, (_) => key.combine(_, value))(tam)
}
