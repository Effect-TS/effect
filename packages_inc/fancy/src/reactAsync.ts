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

export const reactAsync = <K, P, Q>(_V: View<State<K> & ComponentProps<P>, Q>) => (
  _I: {
    [k in keyof K]: T.Sync<K[k]>
  }
) => (
  _P: unknown extends P ? void : {} extends P ? void : T.Async<P>
): React.FC<Q & { children?: React.ReactElement }> => {
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
              (): React.FC<Q> => (q: Q) => {
                React.useEffect(() => () => {
                  f.stop()
                })

                return React.createElement(Cmp, {
                  ...q
                })
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

  return (q) => {
    const [props, setProps] = React.useState<P | null>(null)
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
      if (_P) {
        T.run(_P as T.Async<P>, (ex) => {
          if (Ex.isDone(ex)) {
            setProps(ex.value)
          } else {
            setError("initial props are not supposed to fail")
          }
        })
      }
    }, [])

    if (_P) {
      if (props !== null) {
        return React.createElement(Cmp, {
          ...props,
          ...q
        })
      } else {
        if (error !== null) {
          return React.createElement("div", { children: error })
        } else {
          return q.children || React.createElement(React.Fragment)
        }
      }
    } else {
      return React.createElement(Cmp, {
        ...q
      } as any)
    }
  }
}
