/**
 * A slot has one name in a record: an alias, a nested record sharing a
 * member, or two overlapping subsets is rejected on the key argument, naming
 * the shared identifier. Construction rejects it too when the types are
 * bypassed.
 */
import { Context, type Effect } from "effect"

const a = Context.Operation<() => Effect.Effect<string>>()("test/Shared/a")
const b = Context.Operation<() => Effect.Effect<string>>()("test/Shared/b")
const c = Context.Operation<() => Effect.Effect<string>>()("test/Shared/c")

export const Alias = Context.Operations("test/Shared/Alias", { a, alias: a })

const Sub = Context.Operations("test/Shared/Sub", { a })
export const Nested = Context.Operations("test/Shared/Nested", { a, b, sub: Sub })

const AB = Context.Operations("test/Shared/AB", { a, b })
const BC = Context.Operations("test/Shared/BC", { b, c })
export const Both = Context.Operations("test/Shared/Both", { ab: AB, bc: BC })
