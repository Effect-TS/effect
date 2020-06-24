// minimize circularity by importing only a subset

import { Effect } from "../Effect/effect"

export { access } from "../Effect/access"
export { accessM } from "../Effect/accessM"
export {
  Async,
  AsyncE,
  AsyncR,
  AsyncRE,
  Sync,
  SyncE,
  SyncR,
  SyncRE,
  Effect,
  _A,
  _E,
  _I,
  _R,
  _S,
  _U
} from "../Effect/effect"
export { Do } from "../Effect/instances"
export { map_ } from "../Effect/map_"
export { chain_ } from "../Effect/chain_"
export { provideAll_ } from "../Effect/provideAll_"
export { uninterruptible } from "../Effect/uninterruptible"
export { unit } from "../Effect/unit"
export { succeedNow } from "../Effect/succeedNow"
export { flatten } from "../Effect/flatten"
export { foreach_ } from "../Effect/foreach_"
export { foreachPar_ } from "../Effect/foreachPar_"
export { foreachParN_ } from "../Effect/foreachParN_"
export { result } from "../Effect/result"
export { done } from "../Effect/done"
export { bracketExit_ } from "../Effect/bracketExit_"
export { Exit } from "../Exit/exit"
export { unit as exitUnit } from "../Exit/unit"
export { succeed as exitSucceed } from "../Exit/succeed"
export { collectAll as exitCollectAll } from "../Exit/collectAll"
export { collectAllPar as exitCollectAllPar } from "../Exit/collectAllPar"

export const coerceSE = <S1, E1>() => <S, R, E, A>(
  effect: Effect<S, R, E, A>
): Effect<S1, R, E1, A> => effect as any
