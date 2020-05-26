import { Either } from "../../../Either"
import { Exit } from "../../../Exit"
import * as EffectTypes from "../../Common/effect"

export interface DriverSync<E, A> {
  start(run: EffectTypes.SyncE<E, A>): Either<Error, Exit<E, A>>
}
