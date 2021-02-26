import type { UIO } from "../Effect/effect"
import type { HasTag } from "../Has"
import { tag } from "../Has"
import type { UIO as SyncUIO } from "../Sync/core"

//
// Clock Definition
//

export interface Clock {
  readonly _tag: "@effect-ts/system/Clock"

  readonly currentTime: SyncUIO<number>

  readonly sleep: (ms: number) => UIO<void>
}

//
// Has Clock
//
export const HasClock = tag<Clock>()
export type HasClock = HasTag<typeof HasClock>
