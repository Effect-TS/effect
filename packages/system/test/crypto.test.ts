import * as Ex from "../src/Exit"
import { pipe } from "../src/Function"
import * as L from "../src/Layer"
import {
  CryptoLive,
  hashPassword,
  InvalidPassword,
  PBKDF2ConfigLive,
  verifyPassword
} from "./crypto"
import { testRuntime } from "./crypto/runtime"

describe("Crypto Suite", () => {
  describe("Live", () => {
    const { runPromise, runPromiseExit } = pipe(
      CryptoLive,
      L.using(PBKDF2ConfigLive),
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
      CryptoLive,
      L.using(PBKDF2ConfigLive),
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
