import { HasURI } from "../Has"

import { accessM } from "./accessM"
import { Effect } from "./effect"
import { provideAll_ } from "./provideAll_"

const withMergedMaps = <R0, R1>(r0: R0, r1: R1) => {
  if (r1[HasURI] && r1[HasURI].serviceMap && r0[HasURI] && r0[HasURI].serviceMap) {
    const r0m = r0[HasURI].serviceMap as Map<any, any>
    const r1m = r1[HasURI].serviceMap as Map<any, any>

    return {
      ...r1,
      [HasURI]: {
        serviceMap: new Map([...Array.from(r0m), ...Array.from(r1m)])
      }
    }
  }

  return r1
}

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export const provideSome_ = <R0, S, R, E, A>(
  effect: Effect<S, R, E, A>,
  f: (r0: R0) => R
) => accessM((r0: R0) => provideAll_(effect, withMergedMaps(r0, f(r0))))

/**
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0`.
 */
export const provideSome = <R0, R>(f: (r0: R0) => R) => <S, E, A>(
  effect: Effect<S, R, E, A>
) => accessM((r0: R0) => provideAll_(effect, withMergedMaps(r0, f(r0))))
