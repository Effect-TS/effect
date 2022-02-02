// ets_tracing: off

export const ArrayIndexOutOfBoundsExceptionTypeId = Symbol()
export type ArrayIndexOutOfBoundsExceptionTypeId =
  typeof ArrayIndexOutOfBoundsExceptionTypeId

export class ArrayIndexOutOfBoundsException {
  readonly _typeId: ArrayIndexOutOfBoundsExceptionTypeId =
    ArrayIndexOutOfBoundsExceptionTypeId
  constructor(readonly index: number) {}
}
