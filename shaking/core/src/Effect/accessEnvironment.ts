import { IAccessEnv } from "../Support/Common"
import { SyncR } from "../Support/Common/effect"

export function accessEnvironment<R>(): SyncR<R, R> {
  return new IAccessEnv() as any
}
