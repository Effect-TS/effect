import { pipe } from "../../Function"
import { Effect } from "../Effect/effect"
import { flatten } from "../Effect/flatten"
import { map_ } from "../Effect/map_"
import { tapError_ } from "../Effect/tapError"
import { unit } from "../Effect/unit"
import { zip_ } from "../Effect/zip_"
import * as R from "../Ref"

import { Schedule } from "./schedule"

/**
 * Runs the specified finalizer as soon as the schedule is complete. Note
 * that unlike `Effect#ensuring`, this method does not guarantee the finalizer
 * will be run. The `Schedule` may not initialize or the driver of the
 * schedule may not run to completion. However, if the `Schedule` ever
 * decides not to continue, then the finalizer will be run.
 */
export const ensuring_ = <S, R, ST, A, B, S2, R2>(
  self: Schedule<S, R, ST, A, B>,
  finalizer: Effect<S2, R2, never, any>
): Schedule<S | S2, R & R2, [ST, R.Ref<Effect<S2, R2, never, any>>], A, B> =>
  new Schedule(
    zip_(self.initial, R.makeRef(finalizer)),
    (a: A, s: [ST, R.Ref<Effect<S2, R2, never, any>>]) =>
      map_(
        tapError_(self.update(a, s[0]), (_) =>
          pipe(
            s[1],
            R.modify((fin) => [fin, unit]),
            flatten
          )
        ),
        (_): [ST, R.Ref<Effect<S2, R2, never, any>>] => [_, s[1]]
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
export const ensuring = <S2, R2>(finalizer: Effect<S2, R2, never, any>) => <
  S,
  R,
  ST,
  A,
  B
>(
  self: Schedule<S, R, ST, A, B>
): Schedule<S | S2, R & R2, [ST, R.Ref<Effect<S2, R2, never, any>>], A, B> =>
  ensuring_(self, finalizer)
