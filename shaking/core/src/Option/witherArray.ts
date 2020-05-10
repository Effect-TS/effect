import type { Option } from "fp-ts/lib/Option"

import { array } from "../Array"

import { option } from "./instances"

export const witherArray: <A, B>(
  f: (a: A) => Option<Option<B>>
) => (ta: Array<A>) => Option<Array<B>> = (f) => (ta) => array.wither(option)(ta, f)
