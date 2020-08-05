// minimize circularity by importing only a subset

import { Effect } from "../Effect/effect"

export { access } from "../Effect/access"
export { accessM } from "../Effect/accessM"
export { bracketExit_ } from "../Effect/bracketExit_"
export { chain } from "../Effect/chain"
export { chain_ } from "../Effect/chain_"
export { bind, let, of } from "../Effect/do"
export { done } from "../Effect/done"
export {
  Async,
  AsyncE,
  AsyncR,
  AsyncRE,
  Effect,
  Sync,
  SyncE,
  SyncR,
  SyncRE,
  _A,
  _E,
  _I,
  _R,
  _S,
  _U
} from "../Effect/effect"
export { effectTotal } from "../Effect/effectTotal"
export { environment } from "../Effect/environment"
export { parallel, parallelN } from "../Effect/ExecutionStrategy"
export { fail } from "../Effect/fail"
export { flatten } from "../Effect/flatten"
export { foldCauseM } from "../Effect/foldCauseM"
export { foreachParN_ } from "../Effect/foreachParN_"
export { foreachPar_ } from "../Effect/foreachPar_"
export { foreach_ } from "../Effect/foreach_"
export { forkDaemon } from "../Effect/forkDaemon"
export { interrupt } from "../Effect/interrupt"
export { map } from "../Effect/map"
export { map_ } from "../Effect/map_"
export { provideAll } from "../Effect/provideAll"
export { provideAll_ } from "../Effect/provideAll_"
export { provideSome_ } from "../Effect/provideSome"
export { result } from "../Effect/result"
export { succeed as succeedNow } from "../Effect/succeed"
export { uninterruptible } from "../Effect/uninterruptible"
export { uninterruptibleMask } from "../Effect/uninterruptibleMask"
export { unit } from "../Effect/unit"
export { zipWith } from "../Effect/zipWith"
export { zipWithPar_ } from "../Effect/zipWithPar_"
export { zipWith_ } from "../Effect/zipWith_"
export { zip_ } from "../Effect/zip_"
export { foreach as exitForeach } from "../Exit/api"
export {
  collectAll as exitCollectAll,
  collectAllPar as exitCollectAllPar,
  succeed as exitSucceed,
  unit as exitUnit,
  zipRight_ as exitZipRight_
} from "../Exit/core"
export { Exit } from "../Exit/exit"

export const coerceSE = <S1, E1>() => <S, R, E, A>(
  effect: Effect<S, R, E, A>
): Effect<S1, R, E1, A> => effect as any
