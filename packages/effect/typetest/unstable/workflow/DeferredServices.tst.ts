import { Effect, Exit, Schema } from "effect"
import { DurableDeferred, type WorkflowEngine } from "effect/unstable/workflow"
import { describe, expect, it } from "tstyche"
import * as F from "../../../test/unstable/workflow/DeferredServices.fixture.ts"

type Core = WorkflowEngine.WorkflowEngine | WorkflowEngine.WorkflowInstance

describe("DurableDeferred.into encoding requirements", () => {
  it("fixture requirements are independent before and after JSON conversion", () => {
    expect<typeof F.success.DecodingServices>().type.toBe<never>()
    expect<typeof F.success.EncodingServices>().type.toBe<F.Encoder>()
    expect<typeof F.error.DecodingServices>().type.toBe<never>()
    expect<typeof F.error.EncodingServices>().type.toBe<F.ErrorEncoder>()
    const jsonSuccess = Schema.toCodecJson(F.success)
    const jsonError = Schema.toCodecJson(F.error)
    expect<typeof jsonSuccess.DecodingServices>().type.toBe<never>()
    expect<typeof jsonSuccess.EncodingServices>().type.toBe<F.Encoder>()
    expect<typeof jsonError.DecodingServices>().type.toBe<never>()
    expect<typeof jsonError.EncodingServices>().type.toBe<F.ErrorEncoder>()
    expect<typeof F.gate.successSchema.EncodingServices>().type.toBe<F.Encoder>()
    expect<typeof F.errorGate.errorSchema.EncodingServices>().type.toBe<F.ErrorEncoder>()
  })

  it("data-first success cannot assign to an effect missing Encoder", () => {
    const operation = DurableDeferred.into(Effect.succeed("ok"), F.gate)
    expect<Effect.Services<typeof operation>>().type.toBe<Core | F.Encoder>()
    expect(operation).type.not.toBeAssignableTo<Effect.Effect<string, never, Core>>()
    expect(operation).type.toBeAssignableTo<Effect.Effect<string, never, Core | F.Encoder>>()
    const incomplete = Effect.scoped(F.inInstance(operation))
    expect(Effect.runPromise).type.not.toBeCallableWith(incomplete)
    const complete = incomplete.pipe(Effect.provideService(F.Encoder, { encode: (s) => s }))
    expect(Effect.runPromise).type.toBeCallableWith(complete)
  })

  it("data-last success cannot assign to an effect missing Encoder", () => {
    const operation = Effect.succeed("ok").pipe(DurableDeferred.into(F.gate))
    expect<Effect.Services<typeof operation>>().type.toBe<Core | F.Encoder>()
    expect(operation).type.not.toBeAssignableTo<Effect.Effect<string, never, Core>>()
    expect(operation).type.toBeAssignableTo<Effect.Effect<string, never, Core | F.Encoder>>()
    const incomplete = Effect.scoped(F.inInstance(operation))
    expect(Effect.runPromise).type.not.toBeCallableWith(incomplete)
    const complete = incomplete.pipe(Effect.provideService(F.Encoder, { encode: (s) => s }))
    expect(Effect.runPromise).type.toBeCallableWith(complete)
  })

  it("data-first error cannot assign to an effect missing ErrorEncoder", () => {
    const operation = DurableDeferred.into(Effect.fail("boom"), F.errorGate)
    expect<Effect.Services<typeof operation>>().type.toBe<Core | F.ErrorEncoder>()
    expect(operation).type.not.toBeAssignableTo<Effect.Effect<string, string, Core>>()
    const incomplete = Effect.scoped(F.inInstance(operation))
    expect(Effect.runPromise).type.not.toBeCallableWith(incomplete)
    const complete = incomplete.pipe(Effect.provideService(F.ErrorEncoder, { encode: (s) => s }))
    expect(Effect.runPromise).type.toBeCallableWith(complete)
  })

  it("data-last error cannot assign to an effect missing ErrorEncoder", () => {
    const operation = Effect.fail("boom").pipe(DurableDeferred.into(F.errorGate))
    expect<Effect.Services<typeof operation>>().type.toBe<Core | F.ErrorEncoder>()
    expect(operation).type.not.toBeAssignableTo<Effect.Effect<string, string, Core>>()
    const incomplete = Effect.scoped(F.inInstance(operation))
    expect(Effect.runPromise).type.not.toBeCallableWith(incomplete)
    const complete = incomplete.pipe(Effect.provideService(F.ErrorEncoder, { encode: (s) => s }))
    expect(Effect.runPromise).type.toBeCallableWith(complete)
  })

  it("keeps independent body R and both encoders in either style", () => {
    const first = DurableDeferred.into(F.Body, F.bothGate)
    const last = F.Body.pipe(DurableDeferred.into(F.bothGate))
    expect<Effect.Services<typeof first>>().type.toBe<Core | F.Body | F.Encoder | F.ErrorEncoder>()
    expect<Effect.Services<typeof last>>().type.toBe<Core | F.Body | F.Encoder | F.ErrorEncoder>()
    expect(first).type.not.toBeAssignableTo<Effect.Effect<string, string, Core | F.Body>>()
    expect(last).type.not.toBeAssignableTo<Effect.Effect<string, string, Core | F.Body>>()
    const provided = first.pipe(
      Effect.provideService(F.Encoder, { encode: (s) => s }),
      Effect.provideService(F.ErrorEncoder, { encode: (s) => s })
    )
    expect<Effect.Services<typeof provided>>().type.toBe<Core | F.Body>()
  })

  it("done already requires encoding services in both call styles", () => {
    const token = DurableDeferred.tokenFromExecutionId(F.bothGate, { workflow: F.workflow, executionId: "one" })
    const first = DurableDeferred.done(F.bothGate, { token, exit: Exit.succeed("ok") })
    const last = DurableDeferred.done<typeof F.success, typeof F.error>({ token, exit: Exit.fail("boom") })(F.bothGate)
    expect<Effect.Services<typeof first>>().type.toBe<WorkflowEngine.WorkflowEngine | F.Encoder | F.ErrorEncoder>()
    expect<Effect.Services<typeof last>>().type.toBe<WorkflowEngine.WorkflowEngine | F.Encoder | F.ErrorEncoder>()
    expect(first).type.not.toBeAssignableTo<Effect.Effect<void, never, WorkflowEngine.WorkflowEngine>>()
    expect(last).type.not.toBeAssignableTo<Effect.Effect<void, never, WorkflowEngine.WorkflowEngine>>()
  })

  it("retains existing success and error decoding requirements", () => {
    const first = DurableDeferred.into(F.Body, F.decodingGate)
    const last = F.Body.pipe(DurableDeferred.into(F.decodingGate))
    expect<Effect.Services<typeof first>>().type.toBe<Core | F.Body | F.Decoder | F.ErrorDecoder>()
    expect<Effect.Services<typeof last>>().type.toBe<Core | F.Body | F.Decoder | F.ErrorDecoder>()
  })

  it("plain schemas add no service requirements", () => {
    const first = DurableDeferred.into(Effect.succeed("ok"), F.plainGate)
    const last = Effect.fail("boom").pipe(DurableDeferred.into(F.plainGate))
    expect<Effect.Services<typeof first>>().type.toBe<Core>()
    expect<Effect.Services<typeof last>>().type.toBe<Core>()
    expect(Effect.runPromise).type.toBeCallableWith(Effect.scoped(F.inInstance(first)))
    expect(Effect.runPromise).type.toBeCallableWith(Effect.scoped(F.inInstance(last)))
  })
})
