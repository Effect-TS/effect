import * as T from "@matechs/core/Effect"
import { flow } from "@matechs/core/Function"
import { pipe } from "@matechs/core/Function"
import * as R from "@matechs/core/Ref"
import * as F from "@matechs/core/Service"

export const gracefulURI = "@matechs/graceful/gracefulURI"

const gracefulF_ = F.define({
  [gracefulURI]: {
    onExit: F.fn<(op: T.Async<void>) => T.Async<void>>(),
    trigger: F.cn<T.Async<void>>()
  }
})

export interface Graceful extends F.TypeOf<typeof gracefulF_> {}

export const gracefulF = F.opaque<Graceful>()(gracefulF_)

export const { onExit, trigger } = F.access(gracefulF)[gracefulURI]

const insert = <K>(_: K) => (a: K[]) => [...a, _]

export const provideGraceful = F.implementWith(R.makeRef<T.Async<void>[]>([]))(
  gracefulF
)((_) => ({
  [gracefulURI]: {
    onExit: flow(insert, _.update, T.asUnit),
    trigger: pipe(_.get, T.chain(T.parSequenceArray), T.asUnit)
  }
}))
