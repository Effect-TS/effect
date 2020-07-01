import * as E from "../../Either"
import { identity } from "../../Function"
import * as O from "../../Option"
import { Ref, makeRef } from "../Ref"
import { ImmutableQueue } from "../Support/ImmutableQueue"

import * as T from "./deps"
import { State, Entry, assertNonNegative, Acquisition } from "./state"

export class Semaphore {
  constructor(private readonly state: Ref<State>) {
    this.loop = this.loop.bind(this)
    this.restore = this.restore.bind(this)
    this.releaseN = this.releaseN.bind(this)
    this.restore = this.restore.bind(this)
  }

  get available() {
    return T.map_(
      this.state.get,
      E.fold(() => 0, identity)
    )
  }

  private loop(n: number, state: State, acc: T.Sync<void>): [T.Sync<void>, State] {
    switch (state._tag) {
      case "Right": {
        return [acc, E.right(n + state.right)]
      }
      case "Left": {
        return O.fold_(
          state.left.dequeue(),
          (): [T.Sync<void>, E.Either<T.ImmutableQueue<Entry>, number>] => [
            acc,
            E.right(n)
          ],
          ([[p, m], q]): [T.Sync<void>, E.Either<T.ImmutableQueue<Entry>, number>] => {
            if (n > m) {
              return this.loop(
                n - m,
                E.left(q),
                T.zipFirst_(acc, T.promiseSucceed_(p, undefined))
              )
            } else if (n === m) {
              return [T.zipFirst_(acc, T.promiseSucceed_(p, undefined)), E.left(q)]
            } else {
              return [acc, E.left(q.prepend([p, m - n]))]
            }
          }
        )
      }
    }
  }

  private releaseN(toRelease: number): T.Sync<void> {
    return T.flatten(
      T.chain_(assertNonNegative(toRelease), () =>
        this.state.modify((s) => this.loop(toRelease, s, T.unit))
      )
    )
  }

  private restore(p: T.Promise<never, void>, n: number): T.Async<void> {
    return T.flatten(
      this.state.modify(
        E.fold(
          (q) =>
            O.fold_(
              q.find(([a]) => a === p),
              (): [T.Sync<void>, E.Either<T.ImmutableQueue<Entry>, number>] => [
                this.releaseN(n),
                E.left(q)
              ],
              (x): [T.Sync<void>, E.Either<T.ImmutableQueue<Entry>, number>] => [
                this.releaseN(n - x[1]),
                E.left(q.filter(([a]) => a != p))
              ]
            ),
          (m): [T.Sync<void>, E.Either<T.ImmutableQueue<Entry>, number>] => [
            T.unit,
            E.right(n + m)
          ]
        )
      )
    )
  }

  prepare(n: number) {
    if (n === 0) {
      return T.succeedNow(new Acquisition(T.unit, T.unit))
    } else {
      return T.chain_(T.promiseMake<never, void>(), (p) =>
        this.state.modify(
          E.fold(
            (q): [Acquisition, E.Either<T.ImmutableQueue<Entry>, number>] => [
              new Acquisition(T.promiseWait(p), this.restore(p, n)),
              E.left(q.push([p, n]))
            ],
            (m): [Acquisition, E.Either<T.ImmutableQueue<Entry>, number>] => {
              if (m >= n) {
                return [new Acquisition(T.unit, this.releaseN(n)), E.right(m - n)]
              }
              return [
                new Acquisition(T.promiseWait(p), this.restore(p, n)),
                E.left(new ImmutableQueue([[p, n - m]]))
              ]
            }
          )
        )
      )
    }
  }
}

/**
 * Acquires `n` permits, executes the action and releases the permits right after.
 */
export const withPermits = (n: number) => (s: Semaphore) => <S, R, E, A>(
  e: T.Effect<S, R, E, A>
) =>
  T.bracket_(
    s.prepare(n),
    (a) => T.chain_(a.waitAcquire, () => e),
    (a) => a.release
  )

/**
 * Acquires a permit, executes the action and releases the permit right after.
 */
export const withPermit = (s: Semaphore) => withPermits(1)(s)

/**
 * Acquires `n` permits in a [[Managed]] and releases the permits in the finalizer.
 */
export const withPermitsManaged = (n: number) => (s: Semaphore) =>
  T.makeReserve(
    T.map_(s.prepare(n), (a) => T.makeReservation(() => a.release)(a.waitAcquire))
  )

/**
 * Acquires a permit in a [[Managed]] and releases the permit in the finalizer.
 */
export const withPermitManaged = (s: Semaphore) => withPermitsManaged(1)(s)

/**
 * The number of permits currently available.
 */
export const available = (s: Semaphore) => s.available

/**
 * Creates a new `Sempahore` with the specified number of permits.
 */
export const makeSemaphore = (permits: number) =>
  T.map_(makeRef<State>(E.right(permits)), (state) => new Semaphore(state))
