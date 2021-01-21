import type { Equal } from "./definition"
import { contramap, makeEqual } from "./operations"

export function strictEqual<A>(b: A): (a: A) => boolean {
  return (a) => a === b
}

export const eqStrict: Equal<unknown> = makeEqual(strictEqual)

export const eqBoolean: Equal<boolean> = eqStrict

export const eqNumber: Equal<number> = eqStrict

export const eqDate: Equal<Date> = contramap((date: Date) => date.valueOf())(eqNumber)

export const eqString: Equal<string> = eqStrict
