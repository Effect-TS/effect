import { environment as _ } from "../../Effect/environment"
import type { SyncR } from "./definitions"
import { fromEffect } from "./fromEffect"

export const environment = <R>(): SyncR<R, R> => fromEffect(_<R>())
