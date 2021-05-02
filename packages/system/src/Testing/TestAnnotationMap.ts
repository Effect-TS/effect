import * as HashMap from "../Collections/Immutable/HashMap"
import type { Endomorphism } from "../Function"
import * as O from "../Option"
import type * as TestAnnotation from "./TestAnnotation"

export class TestAnnotationMap {
  static empty = new TestAnnotationMap(HashMap.make())

  constructor(
    readonly map: HashMap.HashMap<TestAnnotation.TestAnnotation<unknown>, unknown>
  ) {}
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
