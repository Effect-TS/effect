import type { Option } from "fp-ts/lib/Option"

import { array } from "../Array"

import { option } from "./instances"

export const traverseArrayWithIndex: <A, E, B>(
  f: (i: number, a: A) => Option<B>
) => (ta: Array<A>) => Option<Array<B>> = (f) => (ta) =>
  array.traverseWithIndex(option)(ta, f)
