import * as React from "react"

import { UnionToIntersection } from "@matechs/core/Base/Apply"
import { pipe } from "@matechs/core/Function"
import * as RE from "@matechs/core/Record"
import * as T from "@matechs/core/next/Effect"
import { unit } from "@matechs/core/next/Exit"
import { Exit, flatten } from "@matechs/core/next/Exit"
import { HasURI } from "@matechs/core/next/Has"
import * as L from "@matechs/core/next/Layer"
import { coerceSE } from "@matechs/core/next/Managed/deps"
import { makeReleaseMap, ReleaseMap } from "@matechs/core/next/Managed/releaseMap"

export class ReactRuntime<R> {
  constructor(readonly env: R) {}
}

export const read = <T, K>(has: T.Has<T, K>) => (runtime: ReactRuntime<T.Has<T, K>>) =>
  runtime.env[has[HasURI].key] as T

export const runAsync = <R>(runtime: ReactRuntime<R>) => <S, E, A>(
  effect: T.Effect<S, R & T.DefaultEnv, E, A>
) => {
  const cancel = T.runAsyncCancel(
    T.provideSome_(effect, (r) => ({ ...r, ...runtime.env }))
  )

  return (cb?: (exit: Exit<E, A>) => void) => {
    T.runAsync(cancel, (ex) => {
      if (cb) {
        cb(flatten(ex))
      }
    })
  }
}

export const run = <R>(runtime: ReactRuntime<R>) => <E, A>(
  effect: T.Effect<never, R & T.DefaultEnv, E, A>
) => {
  return T.runSync(T.provideSome_(effect, (r0) => ({ ...r0, ...runtime.env })))
}

export const runPromise = <R>(runtime: ReactRuntime<R>) => <S, E, A>(
  effect: T.Effect<S, R & T.DefaultEnv, E, A>
) => {
  return T.runPromise(T.provideSome_(effect, (r) => ({ ...r, ...runtime.env })))
}

export function component<R>(): <P>(
  F: (runtime: ReactRuntime<R>) => React.ComponentType<P>
) => React.ComponentType<RuntimeProps<R> & P> {
  return (F) => (p) => React.createElement(F(p.runtime), p)
}

export function componentWith<S extends { [k in keyof S]: T.Has<any, any> }>(s: S) {
  return <P>(
    f: (
      _: { [k in keyof S]: S[k] extends T.Has<infer A, any> ? A : never }
    ) => React.ComponentType<P>
  ) =>
    component<
      UnionToIntersection<
        {
          [k in keyof S]: S[k] extends T.Has<infer A, infer B> ? T.Has<A, B> : never
        }[keyof S]
      >
    >()((r) => {
      return f(RE.map_(s, (h) => read(h)(r as any)) as any)
    })
}

export function render<K>(Cmp: React.ComponentType<RuntimeProps<K>>) {
  return function (layer: L.Layer<never, T.DefaultEnv, never, K>) {
    const rm = T.runSync(makeReleaseMap)
    const pm = T.runSync(L.makeProcessMap)
    const [f, env] = T.runSync(
      pipe(
        T.provideSome_(coerceSE<never, never>()(layer.build.effect), (r0): [
          [T.DefaultEnv, L.ProcessMap],
          ReleaseMap
        ] => [[r0, pm], rm])
      )
    )

    const runtime = new ReactRuntime(env)

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
        return React.createElement(Cmp, { runtime: runtime as any })
      }
    }
  }
}

export type RuntimeProps<R> = { runtime: ReactRuntime<R> }
