import * as M from "mobx"
import * as React from "react"

import { componentPropsURI } from "./componentProps"
import { Fancy, State, stateURI } from "./fancy"

import { View, ComponentProps } from "."

import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import { pipe } from "@matechs/core/Function"

// alpha
/* istanbul ignore file */

export const pageSSG = <K, P, Q>(_V: View<State<K> & ComponentProps<P>, Q>) => (
  _I: {
    [k in keyof K]: T.Sync<K[k]>
  }
) => (
  _P: unknown extends P & Q ? void : {} extends P & Q ? void : T.Async<P & Q>
): {
  page: React.FC<P & Q>
  getStaticProps: () => Promise<{ props: P & Q }>
} => {
  const initial = pipe(
    _I as Record<string, any>,
    T.traverseRecordWI((k: string) =>
      pipe(
        _I[k] as T.Sync<any>,
        T.map((x) => M.observable(x as any))
      )
    ),
    T.map((r) => (r as any) as any)
  )

  const Cmp = (props: P) => {
    const C = pipe(
      initial,
      T.chain((init) => {
        const f = new Fancy(_V)
        return pipe(
          f.ui,
          T.chain((Cmp) =>
            T.sync(
              (): React.FC => () => {
                React.useEffect(() => () => {
                  f.stop()
                })

                return React.createElement(Cmp)
              }
            )
          ),
          T.provide({
            [stateURI]: {
              state: init
            },
            [componentPropsURI]: {
              props
            }
          } as any)
        )
      }),
      T.runSync
    )

    if (Ex.isDone(C)) {
      return React.createElement(C.value)
    } else {
      return React.createElement("div", {
        children: "Rendering can only be sync and should not fail"
      })
    }
  }

  return {
    page: Cmp,
    getStaticProps: () =>
      _P
        ? T.runToPromise(
            pipe(
              _P as T.Effect<unknown, unknown, never, P>,
              T.map((x) => ({ props: x }))
            )
          )
        : Promise.resolve({ props: {} } as any)
  }
}
