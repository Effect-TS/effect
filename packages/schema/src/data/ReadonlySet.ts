/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import * as H from "@fp-ts/schema/annotation/TypeAliasHook"
import type { Arbitrary } from "@fp-ts/schema/Arbitrary"
import type { Guard } from "@fp-ts/schema/Guard"
import * as I from "@fp-ts/schema/internal/common"
import type { Pretty } from "@fp-ts/schema/Pretty"
import type { Schema } from "@fp-ts/schema/Schema"

const guard = <A>(item: Guard<A>): Guard<ReadonlySet<A>> =>
  I.makeGuard(
    readonlySet(item),
    (u): u is Set<A> => u instanceof Set && Array.from(u.values()).every(item.is)
  )

const arbitrary = <A>(item: Arbitrary<A>): Arbitrary<ReadonlySet<A>> =>
  I.makeArbitrary(readonlySet(item), (fc) => fc.array(item.arbitrary(fc)).map((as) => new Set(as)))

const pretty = <A>(item: Pretty<A>): Pretty<ReadonlySet<A>> =>
  I.makePretty(
    readonlySet(item),
    (set) => `new Set([${Array.from(set.values()).map((a) => item.pretty(a)).join(", ")}])`
  )

/**
 * @since 1.0.0
 */
export const readonlySet = <A>(item: Schema<A>): Schema<ReadonlySet<A>> =>
  I.typeAlias(
    [item],
    I.struct({}),
    {
      [H.GuardTypeAliasHookId]: H.typeAliasHook(guard),
      [H.PrettyTypeAliasHookId]: H.typeAliasHook(pretty),
      [H.ArbitraryTypeAliasHookId]: H.typeAliasHook(arbitrary)
    }
  )

/**
 * @since 1.0.0
 */
export const fromArray = <A>(item: Schema<A>): Schema<ReadonlySet<A>> =>
  pipe(I.array(item), I.transform(readonlySet(item), (as) => new Set(as), (set) => Array.from(set)))
