import type { UIO } from "../Effect"
import { AbstractClock } from "./definition"

export class ProxyClock extends AbstractClock {
  constructor(
    readonly currentTime: UIO<number>,
    readonly sleep: (ms: number, __etsTrace?: string) => UIO<void>
  ) {
    super()
  }
}
