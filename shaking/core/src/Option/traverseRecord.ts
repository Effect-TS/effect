import type { Option } from "fp-ts/lib/Option"

import { record } from "../Record"

import { option } from "./instances"

export const traverseRecord: <A, B>(
  f: (a: A) => Option<B>
) => (ta: Record<string, A>) => Option<Record<string, B>> = (f) => (ta) =>
  record.traverse(option)(ta, f)
