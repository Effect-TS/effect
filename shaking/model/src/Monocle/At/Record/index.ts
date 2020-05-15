/**
 * @since 1.7.0
 */
import { At, Lens } from "../../index"

import { Option, isNone, some, none } from "@matechs/core/Option"

const _hasOwnProperty = Object.prototype.hasOwnProperty

export function lookup<A>(k: string, r: Record<string, A>): Option<A> {
  return _hasOwnProperty.call(r, k) ? some(r[k]) : none
}

export function insertAt<A>(
  k: string,
  a: A
): (r: Record<string, A>) => Record<string, A> {
  return (r) => {
    if (r[k] === a) {
      return r
    }
    const out: Record<string, A> = Object.assign({}, r)
    out[k] = a
    return out
  }
}

export function deleteAt(k: string): <A>(r: Record<string, A>) => Record<string, A> {
  return <A>(r: Record<string, A>) => {
    if (!_hasOwnProperty.call(r, k)) {
      return r
    }
    const out: Record<string, A> = Object.assign({}, r)
    delete out[k]
    return out
  }
}

/**
 * @since 1.7.0
 */
export function atRecord<A = never>(): At<Record<string, A>, string, Option<A>> {
  return new At(
    (k) =>
      new Lens(
        (r) => lookup(k, r),
        (oa) => (r) => {
          if (isNone(oa)) {
            return deleteAt(k)(r)
          } else {
            return insertAt(k, oa.value)(r)
          }
        }
      )
  )
}
