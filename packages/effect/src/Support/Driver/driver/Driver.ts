import type { Exit } from "../../../Exit"
import type { Lazy, FunctionN } from "../../../Function"
import type { EffectTypes } from "../../Common"

export interface Driver<E, A> {
  start(run: EffectTypes.AsyncE<E, A>): void
  interrupt(): void
  onExit(f: FunctionN<[Exit<E, A>], void>): Lazy<void>
  completed: Exit<E, A> | undefined
}
