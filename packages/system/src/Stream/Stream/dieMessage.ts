import { dieMessage as _ } from "../../Effect/dieMessage"
import { fromEffect } from "./fromEffect"

export const dieMessage = (msg: string) => fromEffect(_(msg))
