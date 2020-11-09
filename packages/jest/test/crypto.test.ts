import * as T from "@effect-ts/core/Effect"
import * as Ex from "@effect-ts/core/Effect/Exit"
import { pipe } from "@effect-ts/core/Function"

import { testRuntime } from "../src/Runtime"
import {
  CryptoLive,
  hashPassword,
  InvalidPassword,
  PBKDF2ConfigLive,
  verifyPassword
} from "./crypto"

describe("Crypto Suite", () => {
  describe("Live", () => {
    const { it } = pipe(CryptoLive["<<<"](PBKDF2ConfigLive), testRuntime)()

    it("should hash and verify password", () =>
      T.gen(function* (_) {
        const password = "wuihfjierngjkrnjgwrgn"
        const hash = yield* _(hashPassword(password))
        const verify = yield* _(T.result(verifyPassword(password, hash)))

        expect(verify).toEqual(Ex.unit)
      }))

    it("should hash and not verify password", () =>
      T.gen(function* (_) {
        const password = "wuihfjierngjkrnjgwrgn"
        const passwordBad = "wuIhfjierngjkrnjgwrgn"
        const hash = yield* _(hashPassword(password))
        const verify = yield* _(T.result(verifyPassword(passwordBad, hash)))

        expect(verify).toEqual(Ex.fail(new InvalidPassword()))
      }))
  })
  describe("Test", () => {
    const { it } = pipe(CryptoLive["<<<"](PBKDF2ConfigLive), testRuntime)()

    it("should hash and verify password", () =>
      T.gen(function* (_) {
        const password = "wuihfjierngjkrnjgwrgn"
        const hash = yield* _(hashPassword(password))
        const verify = yield* _(T.result(verifyPassword(password, hash)))

        expect(verify).toEqual(Ex.unit)
      }))

    it("should hash and not verify password", () =>
      T.gen(function* (_) {
        const password = "wuihfjierngjkrnjgwrgn"
        const passwordBad = "wuIhfjierngjkrnjgwrgn"
        const hash = yield* _(hashPassword(password))
        const verify = yield* _(T.result(verifyPassword(passwordBad, hash)))

        expect(verify).toEqual(Ex.fail(new InvalidPassword()))
      }))
  })
})
