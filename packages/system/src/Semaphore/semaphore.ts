// ets_tracing: off

import * as L from "../Collections/Immutable/List/index.js"
import * as Tp from "../Collections/Immutable/Tuple/index.js"
import * as E from "../Either/index.js"
import { identity } from "../Function/index.js"
import * as O from "../Option/index.js"
import * as R from "../Ref/index.js"
import { ImmutableQueue } from "../Support/ImmutableQueue/index.js"
import * as T from "./effect.js"
import * as M from "./managed.js"
import * as P from "./promise.js"
import type { State } from "./state.js"
import { Acquisition, assertNonNegative } from "./state.js"

/**
 * An asynchronous semaphore, which is a generalization of a mutex. Semaphores
 * have a certain number of permits, which can be held and released
 * concurrently by different parties. Attempts to acquire more permits than
 * available result in the acquiring fiber being suspended until the specified
 * number of permits become available.
 **/
export class Semaphore {
  constructor(private readonly state: R.Ref<State>) {
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

  private loop(
    n: number,
    state: State,
    acc: T.UIO<void>
  ): Tp.Tuple<[T.UIO<void>, State]> {
    // eslint-disable-next-line no-constant-condition
    while (1) {
      switch (state._tag) {
        case "Right": {
          return Tp.tuple(acc, E.right(n + state.right))
        }
        case "Left": {
          const d = state.left.dequeue()
          if (O.isNone(d)) {
            return Tp.tuple(acc, E.right(n))
          } else {
            const {
              tuple: [
                {
                  tuple: [p, m]
                },
                q
              ]
            } = d.value
            if (n > m) {
              n = n - m
              state = E.left(q)
              acc = T.zipLeft_(acc, P.succeed_(p, undefined))
            } else if (n === m) {
              return Tp.tuple(T.zipLeft_(acc, P.succeed_(p, undefined)), E.left(q))
            } else {
              return Tp.tuple(acc, E.left(q.prepend(Tp.tuple(p, m - n))))
            }
          }
          break
        }
      }
    }
    throw new Error("Bug: we should never get here")
  }

  private releaseN(toRelease: number): T.UIO<void> {
    return T.uninterruptible(
      T.flatten(
        T.chain_(assertNonNegative(toRelease), () =>
          R.modify_(this.state, (s) => this.loop(toRelease, s, T.unit))
        )
      )
    )
  }

  private restore(p: P.Promise<never, void>, n: number): T.UIO<void> {
    return T.flatten(
      R.modify_(
        this.state,
        E.fold(
          (q) =>
            O.fold_(
              q.find(({ tuple: [a] }) => a === p),
              () => Tp.tuple(this.releaseN(n), E.left(q)),
              (x) =>
                Tp.tuple(
                  this.releaseN(n - x[1]),
                  E.left(q.filter(({ tuple: [a] }) => a !== p))
                )
            ),
          (m) => Tp.tuple(T.unit, E.right(n + m))
        )
      )
    )
  }

  prepare(n: number) {
    if (n === 0) {
      return T.succeed(new Acquisition(T.unit, T.unit))
    } else {
      return T.chain_(P.make<never, void>(), (p) =>
        R.modify_(
          this.state,
          E.fold(
            (q) =>
              Tp.tuple(
                new Acquisition(P.await(p), this.restore(p, n)),
                E.left(q.push(Tp.tuple(p, n)))
              ),
            (m) => {
              if (m >= n) {
                return Tp.tuple(
                  new Acquisition(T.unit, this.releaseN(n)),
                  E.right(m - n)
                )
              }
              return Tp.tuple(
                new Acquisition(P.await(p), this.restore(p, n)),
                E.left(new ImmutableQueue(L.of(Tp.tuple(p, n - m))))
              )
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
export function withPermits_<R, E, A>(e: T.Effect<R, E, A>, s: Semaphore, n: number) {
  return T.bracket_(
    s.prepare(n),
    (a) => T.chain_(a.waitAcquire, () => e),
    (a) => a.release
  )
}

/**
 * Acquires `n` permits, executes the action and releases the permits right after.
 *
 * @ets_data_first withPermits_
 */
export function withPermits(s: Semaphore, n: number) {
  return <R, E, A>(e: T.Effect<R, E, A>) =>
    T.bracket_(
      s.prepare(n),
      (a) => T.chain_(a.waitAcquire, () => e),
      (a) => a.release
    )
}

/**
 * Acquires a permit, executes the action and releases the permit right after.
 */
export function withPermit_<R, E, A>(self: T.Effect<R, E, A>, s: Semaphore) {
  return withPermits_(self, s, 1)
}

/**
 * Acquires a permit, executes the action and releases the permit right after.
 *
 * @ets_data_first withPermit_
 */
export function withPermit(s: Semaphore) {
  return <R, E, A>(self: T.Effect<R, E, A>) => withPermit_(self, s)
}

/**
 * Acquires `n` permits in a `Managed` and releases the permits in the finalizer.
 */
export function withPermitsManaged(s: Semaphore, n: number) {
  return M.makeReserve(
    T.map_(s.prepare(n), (a) => M.makeReservation_(a.waitAcquire, () => a.release))
  )
}

/**
 * Acquires a permit in a `Managed` and releases the permit in the finalizer.
 */
export function withPermitManaged(s: Semaphore) {
  return withPermitsManaged(s, 1)
}

/**
 * The number of permits currently available.
 */
export function available(s: Semaphore) {
  return s.available
}

/**
 * Creates a new `Sempahore` with the specified number of permits.
 */
export function makeSemaphore(permits: number) {
  return T.map_(R.makeRef<State>(E.right(permits)), (state) => new Semaphore(state))
}

/**
 * Creates a new `Sempahore` with the specified number of permits.
 */
export function unsafeMakeSemaphore(permits: number) {
  const state = R.unsafeMakeRef<State>(E.right(permits))

  return new Semaphore(state)
}
