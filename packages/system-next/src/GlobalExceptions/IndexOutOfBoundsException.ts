export const IndexOutOfBoundsExceptionTag = "IndexOutOfBoundsException"

export class IndexOutOfBoundsException {
  readonly _tag = IndexOutOfBoundsExceptionTag
  constructor(readonly message: string) {}
}
