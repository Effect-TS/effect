import type { Duration } from "../../data/Duration"
import type { LazyArg } from "../../data/Function"
import type { UIO } from "../Effect"
import { AbstractClock } from "./definition"

export class ProxyClock extends AbstractClock {
  constructor(
    readonly currentTime: UIO<number>,
    readonly sleep: (duration: LazyArg<Duration>, __tsplusTrace?: string) => UIO<void>
  ) {
    super()
  }
}
