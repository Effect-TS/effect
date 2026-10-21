import { defaultLayer } from "../auth/defaults.ts"
import { NewPasswordCheck } from "./newPasswordCheck.ts"

/** @internal */
export const newPasswordLayer = defaultLayer(NewPasswordCheck, NewPasswordCheck.layer())
