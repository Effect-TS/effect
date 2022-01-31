// ets_tracing: off

import * as CL from "../Clock/index.js"
import * as Tp from "../Collections/Immutable/Tuple/index.js"
import * as T from "../Effect/index.js"
import type * as Ex from "../Exit/index.js"
import { pipe } from "../Function/index.js"
import * as Ref from "../Ref/index.js"

export abstract class StrategyBase<State, Environment, Error, Item> {
  readonly _State!: State;
  readonly [T._R]: (_: Environment) => void;
  readonly [T._E]: (_: Error) => void;
  readonly [T._A]: (_: Item) => void

  abstract initial(): T.RIO<Environment, State>

  abstract track(state: State): (item: Ex.Exit<Error, Item>) => T.UIO<void>

  abstract run(state: State, getExcess: T.UIO<number>, shrink: T.UIO<void>): T.UIO<void>
}

export type Strategy<Environment, Error, Item> = StrategyBase<
  unknown,
  Environment,
  Error,
  Item
>

type StrategyState<T extends StrategyBase<any, any, any, any>> = T["_State"]

/**
 * A strategy that does nothing to shrink excess items. This is useful
 * when the minimum size of the pool is equal to its maximum size and so
 * there is nothing to do.
 */
export class None extends StrategyBase<void, unknown, unknown, unknown> {
  initial(): T.RIO<unknown, void> {
    return T.unit
  }

  track(
    _state: StrategyState<this>
  ): (attempted: Ex.Exit<unknown, unknown>) => T.UIO<void> {
    return (_attempted) => T.unit
  }

  run(
    _state: StrategyState<this>,
    _getExcess: T.UIO<number>,
    _shrink: T.UIO<unknown>
  ): T.UIO<void> {
    return T.unit
  }
}

/**
 * A strategy that shrinks the pool down to its minimum size if items in
 * the pool have not been used for the specified duration.
 */
export class TimeToLive extends StrategyBase<
  Tp.Tuple<[CL.Clock, Ref.Ref<number>]>,
  CL.HasClock,
  unknown,
  unknown
> {
  constructor(readonly timeToLive: number) {
    super()
    this.initial = this.initial.bind(this)
    this.track = this.track.bind(this)
    this.run = this.run.bind(this)
  }

  initial(): T.RIO<CL.HasClock, StrategyState<this>> {
    return pipe(
      T.do,
      T.bind("clock", () => T.service(CL.HasClock)),
      T.bind("now", ({ clock }) => clock.currentTime),
      T.bind("ref", ({ now }) => Ref.makeRef(now)),
      T.map(({ clock, ref }) => Tp.tuple(clock, ref))
    )
  }

  track(
    state: StrategyState<this>
  ): (attempted: Ex.Exit<unknown, unknown>) => T.UIO<void> {
    return (_attempted) => {
      const {
        tuple: [clock, ref]
      } = state

      return pipe(
        T.do,
        T.bind("now", () => clock.currentTime),
        T.tap(({ now }) => ref.set(now)),
        T.asUnit
      )
    }
  }

  run(
    state: StrategyState<this>,
    getExcess: T.UIO<number>,
    shrink: T.UIO<unknown>
  ): T.UIO<void> {
    const {
      tuple: [clock, ref]
    } = state

    return T.chain_(getExcess, (excess) => {
      if (excess <= 0) {
        return T.zipRight_(
          clock.sleep(this.timeToLive),
          this.run(state, getExcess, shrink)
        )
      } else {
        return T.chain_(
          T.zip_(ref.get, clock.currentTime),
          ({ tuple: [start, end] }) => {
            const duration = end - start

            if (duration >= this.timeToLive) {
              return T.zipRight_(shrink, this.run(state, getExcess, shrink))
            } else {
              return T.zipRight_(
                clock.sleep(this.timeToLive),
                this.run(state, getExcess, shrink)
              )
            }
          }
        )
      }
    })
  }
}
