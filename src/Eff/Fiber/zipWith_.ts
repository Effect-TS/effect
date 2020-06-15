import * as O from "../../Option"
import { Both } from "../Cause/cause"
import { chain_ as effectChain_ } from "../Effect/chain_"
import { done as effectDone } from "../Effect/done"
import { result as effectResult } from "../Effect/result"
import { zipWithPar_ as effectZipWithPar_ } from "../Effect/zipWithPar_"
import { zipWith_ as effectZipWith_ } from "../Effect/zipWith_"
import { zipWith_ as exitZipWith } from "../Exit/zipWith_"
import * as IT from "../Iterable"

import { Fiber, Syntetic } from "./fiber"

/**
 * Zips this fiber with the specified fiber, combining their results using
 * the specified combiner function. Both joins and interruptions are performed
 * in sequential order from left to right.
 */
export const zipWith_ = <E, A, E1, A1, B>(
  fiberA: Fiber<E, A>,
  fiberB: Fiber<E1, A1>,
  f: (a: A, b: A1) => B
): Syntetic<E | E1, B> => ({
  _tag: "SynteticFiber",
  children: effectZipWith_(fiberA.children, fiberB.children, IT.concat),
  getRef: (ref) =>
    effectZipWith_(fiberA.getRef(ref), fiberB.getRef(ref), (a, b) => ref.join(a, b)),
  inheritRefs: effectChain_(fiberA.inheritRefs, () => fiberB.inheritRefs),
  interruptAs: (id) =>
    effectZipWith_(fiberA.interruptAs(id), fiberB.interruptAs(id), (ea, eb) =>
      exitZipWith(ea, eb, f, Both)
    ),
  poll: effectZipWith_(fiberA.poll, fiberB.poll, (oa, ob) =>
    O.chain_(oa, (ea) => O.map_(ob, (eb) => exitZipWith(ea, eb, f, Both)))
  ),
  wait: effectResult(
    effectZipWithPar_(
      effectChain_(fiberA.wait, effectDone),
      effectChain_(fiberB.wait, effectDone),
      f
    )
  )
})
