import * as Passkey from "@effect/auth/Passkey"
import * as PasskeyContract from "@effect/auth/PasskeyContract"

export const contract = PasskeyContract.make
export const strategy = Passkey.make
