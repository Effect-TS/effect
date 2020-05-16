import type { Apply, sequenceT as ST } from "fp-ts/lib/Apply"
import type { HKT } from "fp-ts/lib/HKT"

import { tuple } from "../Function/tuple"

import { curried } from "./curried"

const tupleConstructors: Record<number, (a: unknown) => unknown> = {}
function getTupleConstructor(len: number): (a: unknown) => any {
  // eslint-disable-next-line no-prototype-builtins
  if (!tupleConstructors.hasOwnProperty(len)) {
    tupleConstructors[len] = curried(tuple, len - 1, [])
  }
  return tupleConstructors[len]
}

export const sequenceT: typeof ST = (<F>(F: Apply<F>) => <A>(
  ...args: Array<HKT<F, A>>
) => {
  const len = args.length
  const f = getTupleConstructor(len)
  let fas = F.map(args[0], f)
  for (let i = 1; i < len; i++) {
    fas = F.ap(fas, args[i])
  }
  return fas
}) as any
