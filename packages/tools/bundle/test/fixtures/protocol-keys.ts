import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Exit from "effect/Exit"

const Key = Context.Service<{ readonly n: number }>("Key")

// Runtime data types whose protocol methods the tests call by their literal
// keys, as another copy of effect would, never through Equal.equals or
// Hash.hash.
export const make = (n: number) => ({
  exit: Exit.succeed({ n }),
  fail: Cause.fail({ n }),
  die: Cause.die({ n }),
  interrupt: Cause.interrupt(n),
  context: Context.make(Key, { n })
})
