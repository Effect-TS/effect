// ets_tracing: off

export const NoSuchElementExceptionTag = "NoSuchElementException"

export class NoSuchElementException {
  readonly _tag = NoSuchElementExceptionTag
}

export const PrematureGeneratorExitTag = "PrematureGeneratorExit"

export class PrematureGeneratorExit extends Error {
  readonly _tag = PrematureGeneratorExitTag
  constructor() {
    super(
      "Something very wrong has happened. Replaying values resulted in a premature end of the generator execution. Provided generator should be pure and perform effects only by yielding them, so that the generator can safely be re-run without side effects."
    )
  }
}
