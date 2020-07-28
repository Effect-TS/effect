// minimize circularity by importing only a subset

import { Effect } from "../Effect/effect"

export { effectTotal } from "../Effect/effectTotal"
export { access } from "../Effect/access"
export { fail } from "../Effect/fail"
export { environment } from "../Effect/environment"
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
export { provideAll } from "../Effect/provideAll"
export { provideSome_ } from "../Effect/provideSome"
export { uninterruptible } from "../Effect/uninterruptible"
export { uninterruptibleMask } from "../Effect/uninterruptibleMask"
export { zipWith_ } from "../Effect/zipWith_"
export { unit } from "../Effect/unit"
export { succeedNow } from "../Effect/succeedNow"
export { flatten } from "../Effect/flatten"
export { foreach_ } from "../Effect/foreach_"
export { foreachPar_ } from "../Effect/foreachPar_"
export { foreachParN_ } from "../Effect/foreachParN_"
export { result } from "../Effect/result"
export { done } from "../Effect/done"
export { bracketExit_ } from "../Effect/bracketExit_"
export { zipWithPar_ } from "../Effect/zipWithPar_"
export { zipWith } from "../Effect/zipWith"
export { interrupt } from "../Effect/interrupt"
export { Exit } from "../Exit/exit"
export { unit as exitUnit } from "../Exit/unit"
export { succeed as exitSucceed } from "../Exit/succeed"
export { collectAll as exitCollectAll } from "../Exit/collectAll"
export { collectAllPar as exitCollectAllPar } from "../Exit/collectAllPar"
export { zipRight_ as exitZipRight_ } from "../Exit/zipRight"
export { foreach as exitForeach } from "../Exit/foreach"
export { parallel, parallelN } from "../Effect/ExecutionStrategy"

export const coerceSE = <S1, E1>() => <S, R, E, A>(
  effect: Effect<S, R, E, A>
): Effect<S1, R, E1, A> => effect as any
