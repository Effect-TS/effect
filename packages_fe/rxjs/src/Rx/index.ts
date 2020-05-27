import * as Rx from "rxjs"

import * as T from "@matechs/core/Effect"
import * as Ex from "@matechs/core/Exit"
import * as F from "@matechs/core/Function"
import * as M from "@matechs/core/Managed"
import * as S from "@matechs/core/Stream"
import { queueUtils, emitter } from "@matechs/core/Stream/Support"
import * as SE from "@matechs/core/StreamEither"

export function encaseObservable<E, A>(
  observable: Rx.Observable<A>,
  onError: (e: any) => E
): S.AsyncE<E, A> {
  return S.fromSource(
    M.chain_(
      M.bracket(
        T.sync(() => {
          const { hasCB, next, ops } = queueUtils<E, A>()

          return {
            s: observable.subscribe(
              (a) => next({ _tag: "offer", a }),
              (e) => next({ _tag: "error", e: onError(e) }),
              () => next({ _tag: "complete" })
            ),
            ops,
            hasCB
          }
        }),
        ({ s }) => T.sync(() => s.unsubscribe())
      ),
      ({ hasCB, ops }) => emitter(ops, hasCB)
    )
  )
}

export function encaseObservableEither<A, E = unknown>(
  observable: Rx.Observable<A>,
  mapError: (_: any) => E = F.identity
): SE.AsyncE<E, A> {
  return SE.fromSource(
    M.chain_(
      M.bracket(
        T.sync(() => {
          const { hasCB, next, ops } = queueUtils<E, A>()

          return {
            s: observable.subscribe(
              (a) => next({ _tag: "offer", a }),
              (e) => next({ _tag: "error", e: mapError(e) }),
              () => next({ _tag: "complete" })
            ),
            ops,
            hasCB
          }
        }),
        ({ s }) => T.sync(() => s.unsubscribe())
      ),
      ({ hasCB, ops }) => emitter(ops, hasCB)
    )
  )
}

export function runToObservable<A>(o: T.Async<Rx.Observable<A>>): Rx.Observable<A> {
  return new Rx.Observable((sub) => {
    T.run(
      o,
      Ex.fold(
        (ob) => {
          const running = ob.subscribe(
            (r) => {
              sub.next(r)
            },
            (e) => {
              sub.error(e)
            },
            () => {
              sub.complete()
            }
          )

          sub.unsubscribe = () => {
            running.unsubscribe()
            sub.closed = true
          }
        },
        (e) => {
          /* istanbul ignore next */
          sub.error(e)
        },
        (u) => {
          /* istanbul ignore next */
          sub.error(u)
        },
        () => {
          /* istanbul ignore next */
          sub.error(new Error("interrupted"))
        }
      )
    )
  })
}

export function toObservable<S, R, E, A>(
  s: S.Stream<S, R, E, A>
): T.AsyncR<R, Rx.Observable<A>> {
  return T.access(
    (r: R) =>
      new Rx.Observable((sub) => {
        const drainer = T.provide(r)(
          S.drain(
            S.mapM_(s, (a) =>
              T.sync(() => {
                sub.next(a)
              })
            )
          )
        )
        const interruptDrain = T.run(
          drainer,
          Ex.fold(
            () => {
              sub.complete()
            },
            (e) => {
              sub.error(e)
              sub.unsubscribe()
            },
            (u) => {
              sub.error(u)
              sub.unsubscribe()
            },
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            () => {}
          )
        )

        sub.unsubscribe = () => {
          sub.closed = true
          interruptDrain()
        }
      })
  )
}
