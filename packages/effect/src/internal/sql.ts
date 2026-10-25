import * as Context from "../Context.ts"

/** @internal */
export const CurrentTransactionBatchKey = Context.Reference<object | undefined>(
  "effect/sql/CurrentTransactionBatchKey",
  { defaultValue: () => undefined }
)
