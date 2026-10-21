import { PasskeyContract } from "@effect/auth/contracts"
import { Passkey } from "@effect/auth/strategies"

export const contract = PasskeyContract.make
export const strategy = Passkey.make
