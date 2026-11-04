// Only functions returning an Effect can be Context operations (Stream.Operation takes functions returning a Stream).
import * as Context from "effect/Context"

export const sync = Context.Operation<(path: string) => string>()("test/sync")

export const value = Context.Operation<{ readonly port: number }>()("test/value")
