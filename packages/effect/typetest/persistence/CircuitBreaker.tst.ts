import { Data, Effect, Exit, Match, Option } from "effect"
import { CircuitBreaker } from "effect/persistence"
import { describe, expect, it } from "tstyche"

class CardDeclined extends Data.TaggedError("CardDeclined")<{}> {}
class ProviderDown extends Data.TaggedError("ProviderDown")<{}> {}
class Unrelated extends Data.TaggedError("Unrelated")<{}> {}
type PaymentError = CardDeclined | ProviderDown

const options = { key: "payments", policy: CircuitBreaker.consecutiveFailures(5), openFor: "30 seconds" } as const

const classify = (exit: Exit.Exit<unknown, PaymentError>): CircuitBreaker.Outcome =>
  Exit.isSuccess(exit) ? "success" : Option.match(Exit.findErrorOption(exit), {
    onNone: () => "failure",
    onSome: Match.type<PaymentError>().pipe(
      Match.withReturnType<CircuitBreaker.Outcome>(),
      Match.tagsExhaustive({ CardDeclined: () => "ignored", ProviderDown: () => "failure" })
    )
  })

declare const breaker: CircuitBreaker.CircuitBreaker<PaymentError>

describe("CircuitBreaker", () => {
  describe("make", () => {
    it("infers the error type from classify", () => {
      expect(CircuitBreaker.make({ ...options, classify })).type.toBe<
        Effect.Effect<CircuitBreaker.CircuitBreaker<PaymentError>, never, CircuitBreaker.CircuitBreakerStore>
      >()
    })

    it("accepts any error without classify", () => {
      expect(CircuitBreaker.make(options)).type.toBe<
        Effect.Effect<CircuitBreaker.CircuitBreaker<unknown>, never, CircuitBreaker.CircuitBreakerStore>
      >()
    })
  })

  describe("execute", () => {
    it("preserves the error type and adds CircuitBreakerError", () => {
      expect(breaker.execute(Effect.fail(new CardDeclined()))).type.toBe<
        Effect.Effect<never, CardDeclined | CircuitBreaker.CircuitBreakerError>
      >()
      expect(CircuitBreaker.execute(Effect.fail(new CardDeclined()), breaker)).type.toBe<
        Effect.Effect<never, CardDeclined | CircuitBreaker.CircuitBreakerError>
      >()
    })

    it("rejects effects with errors classify does not know", () => {
      expect(breaker.execute).type.not.toBeCallableWith(Effect.fail(new Unrelated()))
    })
  })
})
