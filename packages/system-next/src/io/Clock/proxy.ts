import type { UIO } from "../Effect"
import { Clock } from "./definition"

export class ProxyClock extends Clock {
  constructor(
    readonly currentTime: UIO<number>,
    readonly sleep: (ms: number, __etsTrace?: string) => UIO<void>
  ) {
    super()
  }
}
