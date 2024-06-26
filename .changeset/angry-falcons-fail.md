---
"effect": patch
---

Micro: renaming to align with `Effect` module:

- `Failure` -> `MicroCause`
  - `Failure.Expected<E>` -> `MicroCause.Fail<E>`
  - `Failure.Unexpected` -> `MicroCause.Die`
  - `Failure.Aborted` -> `MicroCause.Interrupt`
  - `FailureExpected` -> `CauseFail`
  - `FailureUnexpected` -> `CauseDie`
  - `FailureAborted` -> `CauseInterrupt`
  - `failureIsExpected` -> `causeIsFail`
  - `failureIsExpected` -> `causeIsFail`
  - `failureIsUnexpected` -> `causeIsDie`
  - `failureIsAborted` -> `causeIsInterrupt`
  - `failureSquash` -> `causeSquash`
  - `failureWithTrace` -> `causeWithTrace`
- `Result` -> `MicroExit`
  - `ResultAborted` -> `ExitInterrupt`
  - `ResultSuccess` -> `ExitSucceed`
  - `ResultFail` -> `ExitFail`
  - `ResultFailUnexpected` -> `ExitDie`
  - `ResultFailWith` -> `ExitFailCause`
  - `resultIsSuccess` -> `exitIsSuccess`
  - `resultIsFailure` -> `exitIsFailure`
  - `resultIsAborted` -> `exitIsInterrupt`
  - `resultIsFailureExpected` -> `exitIsFail`
  - `resultIsFailureUnexpected` -> `exitIsDie`
  - `resultVoid` -> `exitVoid`
- `DelayFn` -> `MicroSchedule`
