import type { Auth, Proofs } from "@effect/auth"
import type { Effect, Layer } from "effect"
import { expect, it } from "tstyche"

import type { app } from "../../test/proofs/ingress.test.ts"

// Shared construction must never absorb the trusted caller's invocation requirement.
it("retains request-scoped proof ingress requirements", () => {
  type RawEmail = Effect.Services<
    ReturnType<typeof app.strategies.email.operations.Request.invoke>
  >
  type RawReset = Effect.Services<
    ReturnType<typeof app.strategies.password.operations.RequestReset.invoke>
  >
  type Facade = Effect.Success<typeof app.make>
  type EmailCall = Effect.Services<ReturnType<Facade["signIn"]>>
  type ResetCall = Effect.Services<ReturnType<Facade["requestReset"]>>
  type Construction = Layer.Services<typeof app.layer>

  expect<
    Extract<RawEmail, Proofs.HostIngressLimiter>
  >().type.toBe<Proofs.HostIngressLimiter>()
  expect<
    Extract<RawReset, Proofs.HostIngressLimiter>
  >().type.toBe<Proofs.HostIngressLimiter>()
  expect<
    Extract<RawEmail, Proofs.ProofRequestContext>
  >().type.toBe<Proofs.ProofRequestContext>()
  expect<
    Extract<RawReset, Proofs.ProofRequestContext>
  >().type.toBe<Proofs.ProofRequestContext>()
  expect<
    Extract<EmailCall, Proofs.ProofRequestContext>
  >().type.toBe<Proofs.ProofRequestContext>()
  expect<
    Extract<ResetCall, Proofs.ProofRequestContext>
  >().type.toBe<Proofs.ProofRequestContext>()
  expect<Extract<ResetCall, Proofs.HostIngressLimiter>>().type.toBe<never>()
  expect<Extract<ResetCall, Auth.AuthRequest>>().type.toBe<Auth.AuthRequest>()
  expect<Extract<Construction, Proofs.HostIngressLimiter>>().type.toBe<never>()
  expect<Extract<Construction, Proofs.ProofRequestContext>>().type.toBe<never>()
})
