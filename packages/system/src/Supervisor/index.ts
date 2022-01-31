// ets_tracing: off

/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Supervisor.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import "../Operator/index.js"

import * as SS from "../Collections/Immutable/SortedSet/index.js"
import type * as Tp from "../Collections/Immutable/Tuple/index.js"
import { succeedWith, suspend, unit } from "../Effect/core.js"
import type { Effect, UIO } from "../Effect/effect.js"
import { zip_ } from "../Effect/zip.js"
import type { Exit } from "../Exit/exit.js"
import type { Runtime } from "../Fiber/core.js"
import { runtimeOrd } from "../Fiber/runtimeOrd.js"
import type * as O from "../Option/index.js"
import { AtomicReference } from "../Support/AtomicReference/index.js"

/**
 * A `Supervisor<A>` is allowed to supervise the launching and termination of
 * fibers, producing some visible value of type `A` from the supervision.
 */
export class Supervisor<A> {
  constructor(
    readonly value: UIO<A>,
    readonly unsafeOnStart: <R, E, A>(
      environment: R,
      effect: Effect<R, E, A>,
      parent: O.Option<Runtime<any, any>>,
      fiber: Runtime<E, A>
    ) => Propagation,
    readonly unsafeOnEnd: <E, A>(value: Exit<E, A>, fiber: Runtime<E, A>) => Propagation
  ) {}

  /**
   * Returns a new supervisor that performs the function of this supervisor,
   * and the function of the specified supervisor, producing a tuple of the
   * outputs produced by both supervisors.
   *
   * The composite supervisor indicates that it has fully handled the
   * supervision event if only both component supervisors indicate they have
   * handled the supervision event.
   */
  and<B>(that: Supervisor<B>): Supervisor<Tp.Tuple<[A, B]>> {
    return new Supervisor(
      zip_(this.value, that.value),
      (environment, effect, parent, fiber) =>
        propagationAnd(
          this.unsafeOnStart(environment, effect, parent, fiber),
          that.unsafeOnStart(environment, effect, parent, fiber)
        ),
      (value, fiber) =>
        propagationAnd(this.unsafeOnEnd(value, fiber), that.unsafeOnEnd(value, fiber))
    )
  }

  /**
   * Returns a new supervisor that performs the function of this supervisor,
   * and the function of the specified supervisor, producing a tuple of the
   * outputs produced by both supervisors.
   *
   * The composite supervisor indicates that it has fully handled the
   * supervision event if either component supervisors indicate they have
   * handled the supervision event.
   */
  or<B>(that: Supervisor<B>): Supervisor<Tp.Tuple<[A, B]>> {
    return new Supervisor(
      zip_(this.value, that.value),
      (environment, effect, parent, fiber) =>
        propagationOr(
          this.unsafeOnStart(environment, effect, parent, fiber),
          that.unsafeOnStart(environment, effect, parent, fiber)
        ),
      (value, fiber) =>
        propagationOr(this.unsafeOnEnd(value, fiber), that.unsafeOnEnd(value, fiber))
    )
  }
}

/**
 * A hint indicating whether or not to propagate supervision events across
 * supervisor hierarchies.
 */
export type Propagation = Stop | Continue

/**
 * A hint indicating supervision events no longer require propagation.
 */
export class Stop {
  readonly _tag = "Stop"
}

/**
 * A hint indicating supervision events require further propagation.
 */
export class Continue {
  readonly _tag = "Continue"
}

export const propagationAnd = (self: Propagation, that: Propagation) =>
  self._tag === "Continue" && that._tag === "Continue" ? _continue : _stop

export const propagationOr = (self: Propagation, that: Propagation) =>
  self._tag === "Continue" || that._tag === "Continue" ? _continue : _stop

export const _stop = new Stop()

export const _continue = new Continue()

export const mainFibers: Set<Runtime<any, any>> = new Set<Runtime<any, any>>()

function unsafeTrackMain() {
  const interval = new AtomicReference<NodeJS.Timeout | undefined>(undefined)

  return new Supervisor<Set<Runtime<any, any>>>(
    succeedWith(() => mainFibers),
    (_, __, ___, fiber) => {
      if (mainFibers.has(fiber)) {
        if (typeof interval.get === "undefined") {
          interval.set(
            setInterval(() => {
              // keep process alive
            }, 60000)
          )
        }
      }
      return _continue
    },
    (_, fiber) => {
      mainFibers.delete(fiber)
      if (mainFibers.size === 0) {
        const ci = interval.get

        if (ci) {
          clearInterval(ci)
        }
      }
      return _continue
    }
  )
}

export const trackMainFibers = unsafeTrackMain()

/**
 * Creates a new supervisor that tracks children in a set.
 */
export const track = suspend(() => fibersIn(new AtomicReference(SS.make(runtimeOrd()))))

/**
 * Creates a new supervisor that tracks children in a set.
 */
export function fibersIn(ref: AtomicReference<SS.SortedSet<Runtime<any, any>>>) {
  return succeedWith(
    () =>
      new Supervisor(
        succeedWith(() => ref.get),
        (_, __, ___, fiber) => {
          ref.set(SS.add_(ref.get, fiber))
          return _continue
        },
        (_, fiber) => {
          ref.set(SS.remove_(ref.get, fiber))
          return _continue
        }
      )
  )
}

/**
 * A supervisor that doesn't do anything in response to supervision events.
 */
export const none = new Supervisor<void>(
  unit,
  () => _continue,
  () => _continue
)
