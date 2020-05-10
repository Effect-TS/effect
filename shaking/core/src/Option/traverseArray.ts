import type { Option } from "fp-ts/lib/Option"

import { array } from "../Array"

import { option } from "./instances"

export const traverseArray: <A, B>(
  f: (a: A) => Option<B>
) => (ta: Array<A>) => Option<Array<B>> = (f) => (ta) => array.traverse(option)(ta, f)
