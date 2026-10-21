import type { OperationHttpServer, Proofs } from "@effect/auth"
import type { Effect, Layer } from "effect"
import type { HttpRouter } from "effect/http"
import { expect, it } from "tstyche"

import type { makeHttp, operationServer } from "../../test/proofs/http-ingress.test.ts"

it("retains proof ingress requirements at HTTP invocation", () => {
  type Construction = Effect.Services<typeof operationServer>
  type Invocation = Effect.Services<ReturnType<Effect.Success<typeof operationServer>["handle"]>>
  type Http = ReturnType<typeof makeHttp>
  type Routes = Layer.Services<ReturnType<Http["routes"]>>
  type Callbacks = Layer.Services<ReturnType<Http["callbackRoutes"]>>

  expect<Construction>().type.toBe<
    OperationHttpServer.OperationHttpServerConfig | OperationHttpServer.OperationHttpInvocation
  >()
  expect<
    Extract<Invocation, Proofs.ProofRequestContext>
  >().type.toBe<Proofs.ProofRequestContext>()
  expect<
    Extract<Invocation, Proofs.HostIngressLimiter>
  >().type.toBe<Proofs.HostIngressLimiter>()
  expect<Extract<Routes, Proofs.ProofRequestContext>>().type.toBe<never>()
  expect<
    Extract<HttpRouter.Request.Only<"Requires", Routes>, Proofs.ProofRequestContext>
  >().type.toBe<never>()
  expect<Extract<Callbacks, Proofs.ProofRequestContext>>().type.toBe<never>()
  expect<
    Extract<HttpRouter.Request.Only<"Requires", Callbacks>, Proofs.ProofRequestContext>
  >().type.toBe<never>()
})
