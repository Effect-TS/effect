import { AuthContract, PasskeyContract, SessionContract, TotpContract } from "@effect/auth"

export const makeSessionContract = SessionContract.makeSessionContract
export const makePasskey = PasskeyContract.make
export const makeRegistration = PasskeyContract.makeRegistration
export const makeManagement = PasskeyContract.makeManagement
export const makeTotp = TotpContract.make
export const make = AuthContract.make
export const action = AuthContract.action
export const fromOperation = AuthContract.fromOperation
export const passwordSignIn = AuthContract.passwordSignIn
