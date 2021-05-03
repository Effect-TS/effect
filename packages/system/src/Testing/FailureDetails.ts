import * as NEA from "../Collections/Immutable/NonEmptyArray"
import * as AV from "./AssertionValue"

export const failureDetailsTypeId = Symbol()

/**
 * `FailureDetails` keeps track of details relevant to failures.
 */
export class FailureDetails {
  readonly typeId: typeof failureDetailsTypeId = failureDetailsTypeId

  constructor(readonly assertion: NEA.NonEmptyArray<AV.AssertionValue>) {}
}

export function label_(self: FailureDetails, str: string): FailureDetails {
  const [h, ...tail] = self.assertion

  return new FailureDetails(NEA.make([AV.label_(h, str), ...tail]))
}

export function label(str: string) {
  return (self: FailureDetails) => label_(self, str)
}
