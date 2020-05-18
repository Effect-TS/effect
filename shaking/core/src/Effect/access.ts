import type { FunctionN } from "../Function"
import type { SyncR } from "../Support/Common/effect"

import { accessEnvironment } from "./accessEnvironment"
import { map_ } from "./map"

export function access<R, A>(f: FunctionN<[R], A>): SyncR<R, A> {
  return map_(accessEnvironment<R>(), f)
}
