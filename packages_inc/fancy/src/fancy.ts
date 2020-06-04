import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import * as F from "@matechs/core/Function"
import { pipe } from "@matechs/core/Function"

// alpha
/* istanbul ignore file */

export const dispatcherURI = "@matechs/fancy/dispatcherURI"

export interface Runner<R> {
  [dispatcherURI]: {
    run: (env: R) => <A>(_: T.AsyncR<R, A>, cb?: (a: A) => void) => F.Lazy<void>
  }
}

export const stateURI = "@matechs/fancy/stateURI"

export interface State<S extends { [k: string]: any }> {
  [stateURI]: {
    state: S
  }
}

export const stateOf = <S>(s: S): State<S> => ({
  [stateURI]: {
    state: s
  }
})

export class Fancy<R, P> {
  readonly ui: T.SyncR<R, React.FC<P>>
  private opsC = 0
  private readonly cancellers: Map<number, F.Lazy<void>> = new Map()

  constructor(renderEffect: T.SyncR<R, React.FC<P>>) {
    const dispatch = <R>(r: R) => <A>(
      eff: T.AsyncR<R, A>,
      cb: (a: A) => void = () => {
        //
      }
    ) => {
      const n = this.opsC

      this.opsC = this.opsC + 1

      this.cancellers.set(
        n,
        T.run(T.provide(r)(eff), (ex) => {
          this.cancellers.delete(n)

          if (Ex.isDone(ex)) {
            cb(ex.value)
          } else {
            if (!Ex.isInterrupt(ex)) {
              console.error("dispatched effects are not supposed to fail")
              console.error(ex)
            }
          }
        })
      )

      return () => {
        const d = this.cancellers.get(n)

        this.cancellers.delete(n)

        if (d) {
          d()
        }
      }
    }

    this.ui = pipe(
      renderEffect,
      T.onInterrupted(
        T.sync(() => {
          this.stop()
        })
      ),
      T.provide<Runner<R>>({
        [dispatcherURI]: {
          run: dispatch
        }
      })
    )
  }

  stop() {
    this.cancellers.forEach((c, k) => {
      this.cancellers.delete(k)
      c()
    })
  }
}

function hasRunner<R>(u: unknown): u is Runner<R> {
  return typeof u === "object" && u !== null && dispatcherURI in u
}

export const runner = <R>(): T.SyncR<
  R,
  [
    <A>(_: T.AsyncR<R, A>, cb?: ((a: A) => void) | undefined) => F.Lazy<void>,
    F.Lazy<void>
  ]
> =>
  T.access((s: R) => {
    const session: Map<number, F.Lazy<void>> = new Map()
    let counter = 0

    return hasRunner<R>(s)
      ? [
          <A>(_: T.SyncR<R, A>, cb?: ((a: A) => void) | undefined) => {
            const id = counter
            counter = counter + 1
            const cancel = s[dispatcherURI].run(s)(_, (e) => {
              session.delete(id)
              if (cb) {
                cb(e)
              }
            })
            session.set(id, cancel)
            return () => {
              const c = session.get(id)

              if (c) {
                session.delete(id)

                c()
              }
            }
          },
          () => {
            session.forEach((c, id) => {
              c()

              session.delete(id)
            })
          }
        ]
      : (T.raiseAbort(new Error("runner out of context")) as any)
  })
