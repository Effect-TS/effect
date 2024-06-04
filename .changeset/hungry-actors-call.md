---
"effect": minor
---

add `CircuitBreaker` module which protects external resources against becoming
overloaded under failure conditions.

A `CircuitBreaker` operates in three states:

  - `Closed` (initial state / normal operation): calls are let through
    normally. Call failures and successes update call statistics (eg failure
    count). When the call statistics satisfy the criteria of the provided
    `TrippingStrategy`, the circuit breaker is "tripped" and set to the
    `Open` state. Note that after this switch, any in-flight calls are *not*
    cancelled and their success or failure will no longer affect the state of
    the `CircuitBreaker`.

  - `Open`: all calls fail fast with an `CircuitBreaker.OpenError`. After the
    reset timeout, the state will transition to `HalfOpen`.

  - `HalfOpen`: the first call is let through. Meanwhile all other calls fail
    with a `CircuitBreaker.OpenError` error. If the first call succeeds, the
    state transitions to `Closed` again (normal operation). If it fails, the
    state transitions back to `Open`. The reset timeout is governed by a
    reset policy, which is typically an exponential backoff.

Two tripping strategies are available:

  1. Max Failure Count

     When the number of successive failures exceeds a threshold, the
     `CircuitBreaker` is "tripped".

     **Note**: the maximum number of failures before tripping the
     `CircuitBreaker` is not absolute under concurrent execution. For
     example, consider a scenario where you make `20` calls to a failing
     system concurrently via a `CircuitBreaker` with it's max failure count
     set to `10` failures. The circuit breaker will trip after `10` calls,
     but the remaining `10` that are in-flight will continue to run and fail
     as well.

  2. Max Failure Rate

     When the fraction of failed calls in the specified sample period exceeds
     the defined threshold (between `0` and `1`), the `CircuitBreaker` is
     tripped. The decision to trip the `CircuitBreaker` is made after each
     call, including successful ones.

The `CircuitBreaker` will also record the following metrics, if a non-empty
iterable of `MetricLabel`s is provided:

  - `effect_circuit_breaker_state`: current state (`0` = `Closed`, `1` =
    `HalfOpen`, `2` = `Open`)
  - `effect_circuit_breaker_state_changes`: number of state changes
  - `effect_circuit_breaker_successful_calls`: number of successful calls
  - `effect_circuit_breaker_failed_calls`: number of failed calls
  - `effect_circuit_breaker_rejected_calls`: number of calls rejected in the
    open state

Example usage:

```ts
import { CircuitBreaker, Effect } from "effect"

const program = Effect.gen(function*() {
  // Create a circuit breaker which will "trip" after five failures
  const breaker = yield* CircuitBreaker.withMaxFailures({
    maxFailures: 5
  })
  // Apply the circuit breaker to your effectful programs
  yield* breaker(Effect.succeed("Hello, World!"))
})
```
