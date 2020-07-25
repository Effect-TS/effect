import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as L from "../src/next/Layer"
import * as M from "../src/next/Managed"

const layA = pipe(
  T.effectAsync<unknown, never, { foo: string }>((cb) => {
    setTimeout(() => {
      cb(T.succeedNow({ foo: "foo" }))
    }, 1000)
  }),
  M.makeExit(() =>
    T.effectAsync<unknown, never, void>((cb) => {
      setTimeout(() => {
        cb(T.unit)
      }, 200)
    })
  ),
  L.fromManagedEnv
)

const layB = pipe(
  T.effectAsync<unknown, never, { bar: string }>((cb) => {
    setTimeout(() => {
      cb(T.succeedNow({ bar: "bar" }))
    }, 1000)
  }),
  M.makeExit(() =>
    T.effectAsync<unknown, never, void>((cb) => {
      setTimeout(() => {
        cb(T.unit)
      }, 200)
    })
  ),
  L.fromManagedEnv
)

pipe(
  T.accessM((r: { foo: string } & { bar: string }) =>
    T.effectTotal(() => {
      console.log(r.foo, r.bar)
    })
  ),
  T.provideSomeLayer(L.all(layA, layB)),
  T.runMain
)
