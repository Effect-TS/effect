import * as React from "react"

import { pipe } from "@matechs/core/Function"
import * as T from "@matechs/core/next/Effect"
import { unit } from "@matechs/core/next/Exit"
import { Exit, flatten } from "@matechs/core/next/Exit"
import { HasURI } from "@matechs/core/next/Has"
import * as L from "@matechs/core/next/Layer"
import { coerceSE } from "@matechs/core/next/Managed/deps"
import { makeReleaseMap, ReleaseMap } from "@matechs/core/next/Managed/releaseMap"

export class ReactRuntime<R> {
  constructor(readonly env: R) {}

  read = <T, K>(has: T.Has<T, K>): T => {
    return this.env[has[HasURI].key]
  }

  runAsync = <S, E, A>(effect: T.Effect<S, R & T.DefaultEnv, E, A>) => {
    const cancel = T.runAsyncCancel(
      T.provideSome_(effect, (r) => ({ ...r, ...this.env }))
    )

    return (cb?: (exit: Exit<E, A>) => void) => {
      T.runAsync(cancel, (ex) => {
        if (cb) {
          cb(flatten(ex))
        }
      })
    }
  }

  runPromise = <S, E, A>(effect: T.Effect<S, R & T.DefaultEnv, E, A>) => {
    return T.runPromise(T.provideSome_(effect, (r) => ({ ...r, ...this.env })))
  }

  run = <E, A>(effect: T.Effect<never, R & T.DefaultEnv, E, A>) => {
    return T.runSync(T.provideSome_(effect, (r0) => ({ ...r0, ...this.env })))
  }
}

export function component<R>(): <P>(
  F: (runtime: ReactRuntime<R>) => React.ComponentType<P>
) => React.ComponentType<RuntimeProps<R> & P> {
  return (F) => (p) => React.createElement(F(p.runtime), p)
}

export function provider<A>(layer: L.Layer<never, T.DefaultEnv, never, A>) {
  return function (Cmp: React.ComponentType<RuntimeProps<A>>) {
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
        return <Cmp runtime={runtime} />
      }
    }
  }
}

export type RuntimeProps<R> = { runtime: ReactRuntime<R> }
