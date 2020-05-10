import type { Option } from "fp-ts/lib/Option"

import { record } from "../Record"

import { option } from "./instances"

export const traverseRecordWithIndex: <A, E, B>(
  f: (k: string, a: A) => Option<B>
) => (ta: Record<string, A>) => Option<Record<string, B>> = (f) => (ta) =>
  record.traverseWithIndex(option)(ta, f)
