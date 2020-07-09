import * as React from "react"

import { UnionToIntersection } from "@matechs/core/Base/Apply"
import { pipe } from "@matechs/core/Function"
import * as RE from "@matechs/core/Record"
import * as T from "@matechs/core/next/Effect"
import { Exit, unit } from "@matechs/core/next/Exit"
import { HasURI } from "@matechs/core/next/Has"
import * as L from "@matechs/core/next/Layer"
import { coerceSE } from "@matechs/core/next/Managed/deps"
import { releaseAll } from "@matechs/core/next/Managed/internals"
import { makeReleaseMap, ReleaseMap } from "@matechs/core/next/Managed/releaseMap"

export function component<R>(): <P>(
  F: (runtime: R) => React.ComponentType<P>
) => React.ComponentType<RuntimeProps<R> & P> {
  return (F) => (p) => React.createElement(F(p.runtime), p)
}

export function componentWith<S extends { [k in keyof S]: T.Has<any, any> }>(s: S) {
  return function <P>(
    f: (
      _: { [k in keyof S]: S[k] extends T.Has<infer A, any> ? A : never }
    ) => React.ComponentType<P>
  ) {
    return component<
      UnionToIntersection<
        {
          [k in keyof S]: S[k] extends T.Has<infer A, infer B> ? T.Has<A, B> : never
        }[keyof S]
      >
    >()((r) => {
      // @ts-expect-error
      return f(RE.map_(s, (h) => r[h[HasURI].key]))
    })
  }
}

export function testRuntime<K>(layer: L.Layer<never, T.DefaultEnv, never, K>) {
  const rm = T.runSync(makeReleaseMap)
  const pm = T.runSync(L.makeProcessMap)
  const [, env] = T.runSync(
    pipe(
      T.provideSome_(coerceSE<never, never>()(layer.build.effect), (r0): [
        [T.DefaultEnv, L.ProcessMap],
        ReleaseMap
      ] => [[r0, pm], rm])
    )
  )

  const f = (ex: Exit<any, any>) => releaseAll(rm, ex)

  return {
    runtime: env,
    cleanup: () => T.runPromise(f(unit))
  }
}

export function render<K>(Cmp: React.ComponentType<RuntimeProps<K>>) {
  return function (layer: L.Layer<never, T.DefaultEnv, never, K>) {
    const rm = T.runSync(makeReleaseMap)
    const pm = T.runSync(L.makeProcessMap)
    const [, env] = T.runSync(
      pipe(
        T.provideSome_(coerceSE<never, never>()(layer.build.effect), (r0): [
          [T.DefaultEnv, L.ProcessMap],
          ReleaseMap
        ] => [[r0, pm], rm])
      )
    )

    const f = (ex: Exit<any, any>) => releaseAll(rm, ex)

    return class extends React.Component {
      componentWillUnmount() {
        return () => {
          T.runAsync(f(unit))
        }
      }
      render() {
        if (typeof window === "undefined" && typeof setImmediate === "function") {
          T.runAsync(f(unit))
        }
        return React.createElement(Cmp, { runtime: env })
      }
    }
  }
}

export interface RuntimeProps<R> {
  runtime: R
}
