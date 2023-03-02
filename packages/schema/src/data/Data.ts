/**
 * @since 1.0.0
 */
import * as D from "@effect/data/Data"
import * as E from "@effect/data/Equal"
import { pipe } from "@effect/data/Function"
import { IdentifierId } from "@effect/schema/annotation/AST"
import * as H from "@effect/schema/annotation/Hook"
import * as A from "@effect/schema/Arbitrary"
import * as I from "@effect/schema/internal/common"
import * as P from "@effect/schema/Parser"
import * as PR from "@effect/schema/ParseResult"
import type { Pretty } from "@effect/schema/Pretty"
import type { Schema } from "@effect/schema/Schema"

const toData = <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(a: A): D.Data<A> =>
  Array.isArray(a) ? D.array(a) : D.struct(a)

const parser = <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(
  item: P.Parser<A>
): P.Parser<D.Data<A>> => {
  const decode = P.decode(item)
  const schema = data(item)

  return I.makeParser(
    schema,
    (u, options) =>
      !E.isEqual(u) ?
        PR.failure(PR.type(schema.ast, u)) :
        pipe(decode(u, options), I.map(toData))
  )
}

const arbitrary = <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(
  item: A.Arbitrary<A>
): A.Arbitrary<D.Data<A>> => A.make(data(item), (fc) => item.arbitrary(fc).map(toData))

const pretty = <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(
  item: Pretty<A>
): Pretty<D.Data<A>> =>
  I.makePretty(
    data(item),
    (d) => `Data(${item.pretty(d)})`
  )

/**
 * @since 1.0.0
 */
export const data = <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(
  item: Schema<A>
): Schema<D.Data<A>> =>
  I.typeAlias(
    [item],
    item,
    {
      [IdentifierId]: "Data",
      [H.ParserHookId]: H.hook(parser),
      [H.PrettyHookId]: H.hook(pretty),
      [H.ArbitraryHookId]: H.hook(arbitrary)
    }
  )

/**
 * @since 1.0.0
 */
export const fromStructure = <A extends Readonly<Record<string, any>> | ReadonlyArray<any>>(
  item: Schema<A>
): Schema<D.Data<A>> =>
  pipe(
    item,
    I.transform(data(item), toData, (a) =>
      // @ts-expect-error
      Array.isArray(a) ? Array.from(a) : Object.assign({}, a))
  )
