import { SyncRE } from "../Support/Common/effect"

import { runSync } from "./runSync"

export function runUnsafeSync<E, A>(io: SyncRE<{}, E, A>): A {
  const result = runSync(io)
  if (result._tag !== "Done") {
    throw result._tag === "Raise"
      ? result.error
      : result._tag === "Abort"
      ? result.abortedWith
      : result
  }
  return result.value
}
