import * as Ex from "../src/Exit"
import { pipe } from "../src/Function"
import {
  CryptoLive,
  hashPassword,
  InvalidPassword,
  PBKDF2ConfigLive,
  PBKDF2ConfigTest,
  verifyPassword
} from "./crypto"
import { testRuntime } from "./crypto/runtime"

describe("Crypto Suite", () => {
  describe("Live", () => {
    const { runPromise, runPromiseExit } = pipe(
      CryptoLive["<<<"](PBKDF2ConfigLive),
      testRuntime
    )()

    it("should hash and verify password", async () => {
      const password = "wuihfjierngjkrnjgwrgn"
      const hash = await runPromise(hashPassword(password))
      const verify = await runPromiseExit(verifyPassword(password, hash))

      expect(verify).toEqual(Ex.unit)
    })

    it("should hash and not verify password", async () => {
      const password = "wuihfjierngjkrnjgwrgn"
      const passwordBad = "wuIhfjierngjkrnjgwrgn"
      const hash = await runPromise(hashPassword(password))
      const verify = await runPromiseExit(verifyPassword(passwordBad, hash))

      expect(verify).toEqual(Ex.fail(new InvalidPassword()))
    })
  })
  describe("Test", () => {
    const { runPromise, runPromiseExit } = pipe(
      CryptoLive["<<<"](PBKDF2ConfigTest),
      testRuntime
    )()

    it("should hash and verify password", async () => {
      const password = "wuihfjierngjkrnjgwrgn"
      const hash = await runPromise(hashPassword(password))
      const verify = await runPromiseExit(verifyPassword(password, hash))

      expect(verify).toEqual(Ex.unit)
    })

    it("should hash and not verify password", async () => {
      const password = "wuihfjierngjkrnjgwrgn"
      const passwordBad = "wuIhfjierngjkrnjgwrgn"
      const hash = await runPromise(hashPassword(password))
      const verify = await runPromiseExit(verifyPassword(passwordBad, hash))

      expect(verify).toEqual(Ex.fail(new InvalidPassword()))
    })
  })
})
