import type { ReadonlyRecord } from "fp-ts/lib/ReadonlyRecord"

import { collect } from "./record"

export const toReadonlyArray: <K extends string, A>(
  r: ReadonlyRecord<K, A>
) => ReadonlyArray<readonly [K, A]> =
  /*#__PURE__*/
  (() => collect((k, a) => [k, a]))() as any
