export const NoSuchElementExceptionTag = "NoSuchElementException"

export class NoSuchElementException extends Error {
  readonly _tag = NoSuchElementExceptionTag
  constructor() {
    super(NoSuchElementExceptionTag)
  }
}
