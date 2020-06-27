import { Effect } from "../Effect/effect"
import { flatten } from "../Effect/flatten"
import { map_ } from "../Effect/map_"
import { tapError_ } from "../Effect/tapError"
import { unit } from "../Effect/unit"
import { zip_ } from "../Effect/zip_"
import { makeRef, Ref } from "../Ref"

import { Schedule, ScheduleClass } from "./schedule"

/**
 * Runs the specified finalizer as soon as the schedule is complete. Note
 * that unlike `Effect#ensuring`, this method does not guarantee the finalizer
 * will be run. The `Schedule` may not initialize or the driver of the
 * schedule may not run to completion. However, if the `Schedule` ever
 * decides not to continue, then the finalizer will be run.
 */
export const ensuring_ = <S, R, A, B, S2, R2>(
  self: Schedule<S, R, A, B>,
  finalizer: Effect<S2, R2, never, any>
): Schedule<S | S2, R & R2, A, B> =>
  new ScheduleClass(
    zip_(self.initial, makeRef(finalizer)),
    (a: A, s: [any, Ref<Effect<S2, R2, never, any>>]) =>
      map_(
        tapError_(self.update(a, s[0]), (_) =>
          flatten(s[1].modify((fin) => [fin, unit]))
        ),
        (_): [any, Ref<Effect<S2, R2, never, any>>] => [_, s[1]]
      ),
    (a, [s]) => self.extract(a, s)
  )

/**
 * Runs the specified finalizer as soon as the schedule is complete. Note
 * that unlike `Effect#ensuring`, this method does not guarantee the finalizer
 * will be run. The `Schedule` may not initialize or the driver of the
 * schedule may not run to completion. However, if the `Schedule` ever
 * decides not to continue, then the finalizer will be run.
 */
export const ensuring = <S2, R2>(finalizer: Effect<S2, R2, never, any>) => <S, R, A, B>(
  self: Schedule<S, R, A, B>
): Schedule<S | S2, R & R2, A, B> => ensuring_(self, finalizer)
