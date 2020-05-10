import type { Option } from "fp-ts/lib/Option"

import { record } from "../Record"

import { option } from "./instances"

export const witherRecord: <A, B>(
  f: (a: A) => Option<Option<B>>
) => (ta: Record<string, A>) => Option<Record<string, B>> = (f) => (ta) =>
  record.wither(option)(ta, f)
