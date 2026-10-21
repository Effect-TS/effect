import { Auth, Email, OAuth, Passkey, Password, PhoneOtp, Sessions, Totp } from "@effect/auth"
import type { ProofKeys } from "@effect/auth/Proofs"
import type { SmsDelivery } from "@effect/auth/SmsDelivery"
import type { Layer } from "effect"
import { Schema } from "effect"
import { expect, it } from "tstyche"

// Compile-only proof of requirements inferred through Auth.make and its strategies.
it("retains the requirements of selected authentication strategies", () => {
  const app = Auth.make("test/default-strategies", {
    claims: Schema.Struct({}),
    sessions: Sessions.stateful(),
    strategies: {
      phone: PhoneOtp.make(),
      email: Email.makeCode(),
      link: Email.makeLink({ url: "https://example.invalid/sign-in" }),
      password: Password.make(),
      passkey: Passkey.make(),
      oauth: OAuth.make(),
      totp: Totp.make()
    }
  })

  type Dependencies = Layer.Services<typeof app.layer>
  expect<Extract<Dependencies, SmsDelivery>>().type.toBe<SmsDelivery>()
  expect<Extract<Dependencies, ProofKeys>>().type.toBe<ProofKeys>()
  expect<
    Extract<Dependencies, Passkey.PasskeyConfig>
  >().type.toBe<Passkey.PasskeyConfig>()
  expect<
    Extract<Layer.Services<typeof app.strategies.link.layer>, ProofKeys>
  >().type.toBe<never>()

  const managedPassword = Auth.make("test/password-defaults", {
    claims: Schema.Struct({}),
    sessions: Sessions.stateful(),
    strategies: {
      password: Password.make({
        registration: Schema.Struct({}),
        reset: Password.resetLink({ url: "https://example.invalid/reset" })
      })
    }
  })

  expect<
    Extract<Layer.Services<typeof managedPassword.layer>, ProofKeys>
  >().type.toBe<never>()
})
