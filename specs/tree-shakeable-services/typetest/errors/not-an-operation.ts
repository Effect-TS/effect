// Only functions returning an Effect or a Stream can be operations.
import { Operation } from "../../src/Operation.ts"

export const sync = Operation<(path: string) => string>()("test/sync")

export const value = Operation<{ readonly port: number }>()("test/value")
