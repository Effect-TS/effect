import * as AuthContract from "@effect/auth/AuthContract"
import * as PasskeyContract from "@effect/auth/PasskeyContract"
import * as SessionContract from "@effect/auth/SessionContract"
import * as TotpContract from "@effect/auth/TotpContract"

export const makeSessionContract = SessionContract.makeSessionContract
export const makePasskey = PasskeyContract.make
export const makeRegistration = PasskeyContract.makeRegistration
export const makeManagement = PasskeyContract.makeManagement
export const makeTotp = TotpContract.make
export const make = AuthContract.make
export const action = AuthContract.action
export const fromOperation = AuthContract.fromOperation
export const passwordSignIn = AuthContract.passwordSignIn
