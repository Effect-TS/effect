/**
 * The one-line form prints as `Operations.Of<members>`: the record of its
 * members, each an `Operation<key, shape>`. The named form prints its name.
 */
import { Context, type Effect } from "effect"
import * as FileSystem from "../../src/FileSystem.ts"

const find = Context.Operation<(id: string) => Effect.Effect<string>>()("test/Users/find")
const create = Context.Operation<(name: string) => Effect.Effect<void>>()("test/Users/create")
const Users = Context.Operations("test/Users", { find, create })

export const oneLine: number = Users
export const named: number = FileSystem.ReadOnly
