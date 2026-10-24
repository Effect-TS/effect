/** @internal */

import type { Simplify } from "../Types.ts"

// A deliberately small SQL grammar, evaluated entirely by TypeScript.
// Unsupported syntax produces an error instead of falling back to unknown rows.
export type Database = Readonly<Record<string, Readonly<Record<string, unknown>>>>

declare const sqlError: unique symbol
type Failure<Message extends string> = { readonly [sqlError]: Message }
type Tokens = ReadonlyArray<string>
type Step<Rest extends Tokens, Value> = { readonly rest: Rest; readonly value: Value }
type Space = " " | "\n" | "\r" | "\t"
type Lower =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z"
type Start = Lower | Uppercase<Lower> | "_"
type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
type Comparison = "=" | "!=" | "<>" | "<" | "<=" | ">" | ">="

type Word<S extends string, Acc extends string = ""> = S extends `${infer Head}${infer Rest}`
  ? Head extends Start | Digit ? Word<Rest, `${Acc}${Head}`> : [Acc, S]
  : [Acc, ""]

type Tokenize<S extends string, Acc extends Tokens = []> = S extends "" ? Acc
  : S extends `${Space}${infer Rest}` ? Tokenize<Rest, Acc>
  : S extends `:${infer Rest}`
    ? Rest extends `${Start}${string}`
      ? Word<Rest> extends [infer Name extends string, infer Tail extends string]
        ? Tokenize<Tail, [...Acc, `:${Name}`]> :
      never
    : Failure<"Expected a name after :">
  : S extends `${infer Head}${infer Rest}`
    ? Head extends Start
      ? Word<S> extends [infer Name extends string, infer Tail extends string] ? Tokenize<Tail, [...Acc, Name]> : never
    : S extends `${infer A extends "<" | ">" | "!"}${infer B extends "=" | ">"}${infer Tail}`
      ? `${A}${B}` extends Comparison ? Tokenize<Tail, [...Acc, `${A}${B}`]>
      : Failure<`Unsupported operator ${A}${B}`>
    : Head extends "," | "." | "*" | ";" | "=" | "<" | ">" ? Tokenize<Rest, [...Acc, Head]>
    : Failure<`Unsupported SQL character ${Head}; use :named parameters for values`>
  : never

type BeforeFrom<T extends Tokens, Acc extends Tokens = []> = T extends
  [infer Head extends string, ...infer Rest extends Tokens]
  ? Uppercase<Head> extends "FROM" ? Step<Rest, Acc> : BeforeFrom<Rest, [...Acc, Head]>
  : Failure<"Expected FROM">

// These tokens can evaluate as literals even when a column has the same name.
type LiteralKeyword = "NULL" | "TRUE" | "FALSE" | "CURRENT_DATE" | "CURRENT_TIME" | "CURRENT_TIMESTAMP"
type IsUnion<T, Whole = T> = T extends Whole ? [Whole] extends [T] ? false : true : never
type Field = { readonly name: string; readonly type: unknown }
type ColumnName<S extends Database, Table extends keyof S & string, Name extends string, Rest extends Tokens> =
  Uppercase<Name> extends LiteralKeyword ? Failure<`Column ${Name} requires a quoted identifier`>
    : Name extends keyof S[Table] ? Step<Rest, { readonly name: Name; readonly type: S[Table][Name] }>
    : Failure<`Unknown column ${Name} on ${Table}`>

type SourcesWithColumn<S extends Database, Name extends PropertyKey> = {
  [Table in keyof S]: Name extends keyof S[Table] ? Table : never
}[keyof S]

// SQLite resolves identifiers without case, while returned object keys retain their spelling.
type MatchingSources<S extends Database, Name extends string> = {
  [Table in keyof S]: Uppercase<Name> extends Uppercase<keyof S[Table] & string> ? Table : never
}[keyof S]

type UnqualifiedColumn<S extends Database, Name extends string, Rest extends Tokens> = MatchingSources<S, Name> extends
  infer Table ? [Table] extends [never] ? Failure<`Unknown column ${Name}`>
  : true extends IsUnion<Table> ? Failure<`Ambiguous column ${Name}; qualify it with a table alias`>
  : Table extends keyof S & string ? ColumnName<S, Table, Name, Rest>
  : never
  : never

type Column<S extends Database, T extends Tokens> = T extends
  [infer Qualifier extends string, ".", infer Name extends string, ...infer Rest extends Tokens]
  ? Qualifier extends keyof S ? ColumnName<S, Qualifier, Name, Rest>
  : Failure<`Unknown table qualifier ${Qualifier}`>
  : T extends [infer Name extends string, ...infer Rest extends Tokens] ? UnqualifiedColumn<S, Name, Rest>
  : Failure<"Expected a column">

type ColumnNames<S extends Database> = { [Table in keyof S]: keyof S[Table] }[keyof S]
type DuplicateColumns<S extends Database> = {
  [Name in ColumnNames<S>]: true extends IsUnion<SourcesWithColumn<S, Name>> ? Name : never
}[ColumnNames<S>]
type AllColumns<S extends Database> = [DuplicateColumns<S>] extends [never] ? {
    readonly [Name in ColumnNames<S>]: S[SourcesWithColumn<S, Name>][Name & keyof S[SourcesWithColumn<S, Name>]]
  }
  : Failure<"Duplicate result column; use AS aliases">

type Projection<S extends Database, T extends Tokens> = T extends ["*"] ? AllColumns<S>
  : T extends [infer Table extends string, ".", "*"] ? Table extends keyof S ? S[Table]
    : Failure<`Unknown table qualifier ${Table}`>
  : Column<S, T> extends infer C
    ? C extends Step<infer Rest, infer F extends Field> ? Rest extends [] ? { readonly [K in F["name"]]: F["type"] }
      : Rest extends [infer As extends string, infer Alias extends string]
        ? Uppercase<As> extends "AS" ? Alias extends `${Start}${string}` ? { readonly [K in Alias]: F["type"] }
          : Failure<"Expected an alias">
        : Failure<"Expected AS before an alias">
      : Failure<"Unsupported SELECT expression">
    : C
  : never

type AddProjection<S extends Database, T extends Tokens, Row> = Projection<S, T> extends infer P ?
  P extends Failure<string> ? P
  : keyof P & keyof Row extends never ? Row & P
  : Failure<"Duplicate result column; use AS aliases">
  : never

type Projections<
  S extends Database,
  T extends Tokens,
  Row = {},
  Current extends Tokens = []
> = T extends [infer Head extends string, ...infer Rest extends Tokens]
  ? Head extends ","
    ? AddProjection<S, Current, Row> extends infer Next
      ? Next extends Failure<string> ? Next : Projections<S, Rest, Next>
    : never
  : Projections<S, Rest, Row, [...Current, Head]>
  : AddProjection<S, Current, Row>

type AddParameter<P, Name extends string, Value> = Simplify<P & { readonly [K in Name]: Value }> extends infer Next
  ? Name extends keyof Next ? [Next[Name]] extends [never] ? Failure<`Incompatible uses of parameter :${Name}`> : Next
  : never
  : never

type Parameter<T extends Tokens, P, Value> = T extends [`:${infer Name}`, ...infer Rest extends Tokens]
  ? AddParameter<P, Name, Value> extends infer Next ? Next extends Failure<string> ? Next : Step<Rest, Next>
  : never
  : Failure<"Expected a :named parameter">

type Operand<S extends Database, T extends Tokens, P, Value> = T extends [`:${string}`, ...Tokens]
  ? Parameter<T, P, Value>
  : Column<S, T> extends infer C ? C extends Step<infer Rest, unknown> ? Step<Rest, P> : C
  : never

type Condition<S extends Database, T extends Tokens, P> = Column<S, T> extends infer C
  ? C extends Step<infer Rest, infer F extends Field>
    ? Rest extends [infer Op extends string, ...infer Tail extends Tokens]
      ? Op extends Comparison ? Operand<S, Tail, P, F["type"]>
      : Uppercase<Op> extends "IS"
        ? Tail extends [infer NotOrNull extends string, ...infer End extends Tokens]
          ? Uppercase<NotOrNull> extends "NULL" ? Step<End, P>
          : Uppercase<NotOrNull> extends "NOT"
            ? End extends [infer Null extends string, ...infer Last extends Tokens]
              ? Uppercase<Null> extends "NULL" ? Step<Last, P> : Failure<"Expected NULL">
            : Failure<"Expected NULL">
          : Failure<"Expected NULL or NOT NULL">
        : Failure<"Expected NULL or NOT NULL">
      : Failure<"Expected a comparison or IS NULL">
    : Failure<"Expected a comparison">
  : C
  : never

type Conditions<S extends Database, T extends Tokens, P> = Condition<S, T, P> extends infer C
  ? C extends Step<infer Rest, infer Next>
    ? Rest extends [infer And extends string, ...infer Tail extends Tokens]
      ? Uppercase<And> extends "AND" ? Conditions<S, Tail, Next> : C
    : C
  : C
  : never

type Where<S extends Database, T extends Tokens, P> = T extends
  [infer Head extends string, ...infer Rest extends Tokens]
  ? Uppercase<Head> extends "WHERE" ? Conditions<S, Rest, P> : Step<T, P>
  : Step<T, P>

type Direction<T extends Tokens> = T extends [infer Head extends string, ...infer Rest extends Tokens]
  ? Uppercase<Head> extends "ASC" | "DESC" ? Rest : T
  : T

type OrderColumns<S extends Database, T extends Tokens> = Column<S, T> extends infer C
  ? C extends Step<infer Rest, unknown>
    ? Direction<Rest> extends infer End extends Tokens
      ? End extends [",", ...infer Tail extends Tokens] ? OrderColumns<S, Tail> : End
    : never
  : C
  : never

type Order<S extends Database, T extends Tokens> = T extends [infer Head extends string, ...infer Rest extends Tokens]
  ? Uppercase<Head> extends "ORDER"
    ? Rest extends [infer By extends string, ...infer Tail extends Tokens]
      ? Uppercase<By> extends "BY" ? OrderColumns<S, Tail> : Failure<"Expected BY">
    : Failure<"Expected BY">
  : T
  : T

type Offset<T extends Tokens, P> = T extends [infer Head extends string, ...infer Rest extends Tokens]
  ? Uppercase<Head> extends "OFFSET" ? Parameter<Rest, P, number> : Step<T, P>
  : Step<T, P>

type Limit<T extends Tokens, P> = T extends [infer Head extends string, ...infer Rest extends Tokens]
  ? Uppercase<Head> extends "LIMIT"
    ? Parameter<Rest, P, number> extends infer L ? L extends Step<infer Tail, infer Next> ? Offset<Tail, Next> : L
    : never
  : Step<T, P>
  : Step<T, P>

type Finish<T extends Tokens, Row, P> = T extends [] | [";"] ? { readonly row: Row; readonly params: P }
  : Failure<`Unsupported SQL near ${T[0]}`>

type Clauses<S extends Database, T extends Tokens, Row, P> = Where<S, T, P> extends infer W
  ? W extends Step<infer Rest, infer Params>
    ? Order<S, Rest> extends infer O
      ? O extends Tokens
        ? Limit<O, Params> extends infer L ? L extends Step<infer Tail, infer Next> ? Finish<Tail, Row, Next> : L
        : never
      : O
    : never
  : W
  : never

type JoinKind = "INNER" | "LEFT" | "RIGHT" | "FULL" | "CROSS"
// These tokens start clauses rather than implicit table aliases, even for unsupported clauses.
type AliasBoundary =
  | JoinKind
  | "JOIN"
  | "OUTER"
  | "NATURAL"
  | "ON"
  | "USING"
  | "WHERE"
  | "ORDER"
  | "GROUP"
  | "HAVING"
  | "LIMIT"
  | "OFFSET"
  | "UNION"
  | "EXCEPT"
  | "INTERSECT"
  | "WINDOW"
  | "INDEXED"
  | "NOT"

type TableAlias<D extends Database, Table extends keyof D, T extends Tokens> = T extends
  [infer Head extends string, ...infer Rest extends Tokens]
  ? Uppercase<Head> extends "AS"
    ? Rest extends [infer Alias extends string, ...infer Tail extends Tokens]
      ? Alias extends `${Start}${string}` ? Step<Tail, { readonly [K in Alias]: D[Table] }>
      : Failure<"Expected a table alias">
    : Failure<"Expected a table alias">
  : Uppercase<Head> extends AliasBoundary ? Step<T, Pick<D, Table>>
  : Head extends `${Start}${string}` ? Step<Rest, { readonly [K in Head]: D[Table] }>
  : Step<T, Pick<D, Table>>
  : Step<T, Pick<D, Table>>

type Table<D extends Database, T extends Tokens> = T extends [infer Name extends string, ...infer Rest extends Tokens]
  ? Name extends keyof D ? TableAlias<D, Name, Rest> : Failure<`Unknown table ${Name}`>
  : Failure<"Expected a table">

type ExpectJoin<T extends Tokens, Kind extends JoinKind> = T extends
  [infer Head extends string, ...infer Rest extends Tokens]
  ? Uppercase<Head> extends "JOIN" ? Step<Rest, Kind> : Failure<`Expected JOIN after ${Kind}`>
  : Failure<`Expected JOIN after ${Kind}`>

type JoinOperator<T extends Tokens> = T extends [infer Head extends string, ...infer Rest extends Tokens]
  ? Uppercase<Head> extends "JOIN" ? Step<Rest, "INNER">
  : Uppercase<Head> extends infer Kind extends JoinKind
    ? Kind extends "LEFT" | "RIGHT" | "FULL"
      ? Rest extends [infer Outer extends string, ...infer Tail extends Tokens]
        ? Uppercase<Outer> extends "OUTER" ? ExpectJoin<Tail, Kind> : ExpectJoin<Rest, Kind>
      : ExpectJoin<Rest, Kind>
    : ExpectJoin<Rest, Kind>
  : Step<T, undefined>
  : Step<T, undefined>

type NullableSources<S extends Database> = {
  readonly [Alias in keyof S]: { readonly [Name in keyof S[Alias]]: S[Alias][Name] | null }
}
type JoinScope<Left extends Database, Right extends Database, Kind extends JoinKind> =
  & (Kind extends "RIGHT" | "FULL" ? NullableSources<Left> : Left)
  & (Kind extends "LEFT" | "FULL" ? NullableSources<Right> : Right)

type Join<
  D extends Database,
  Left extends Database,
  Right extends Database,
  Kind extends JoinKind,
  T extends Tokens,
  P
> = Uppercase<keyof Left & string> & Uppercase<keyof Right & string> extends never
  ? Kind extends "CROSS" ? Joins<D, T, Left & Right, P>
  : T extends [infer On extends string, ...infer Rest extends Tokens] ? Uppercase<On> extends "ON"
      // ON sees the inputs; the current join adds unmatched null rows afterwards.
      ? Conditions<Left & Right, Rest, P> extends infer C
        ? C extends Step<infer Tail, infer Params> ? Joins<D, Tail, JoinScope<Left, Right, Kind>, Params> : C
      : never
    : Failure<"Expected ON after joined table">
  : Failure<"Expected ON after joined table">
  : Failure<"Duplicate table alias">

type Joins<D extends Database, T extends Tokens, S extends Database, P> = JoinOperator<T> extends infer J
  ? J extends Step<infer Rest, infer Kind>
    ? Kind extends JoinKind
      ? Table<D, Rest> extends infer R
        ? R extends Step<infer Tail, infer Source extends Database> ? Join<D, S, Source, Kind, Tail, P> : R
      : never
    : Step<T, { readonly scope: S; readonly params: P }>
  : J
  : never

type From<D extends Database, T extends Tokens> = Table<D, T> extends infer F
  ? F extends Step<infer Rest, infer S extends Database> ? Joins<D, Rest, S, {}> : F
  : never

type SelectFrom<D extends Database, T extends Tokens> = BeforeFrom<T> extends infer F
  ? F extends Step<infer Rest, infer Fields extends Tokens>
    ? From<D, Rest> extends infer S
      ? S extends Step<infer Tail, { readonly scope: infer Scope extends Database; readonly params: infer P }>
        ? Projections<Scope, Fields> extends infer Row
          ? Row extends Failure<string> ? Row : Clauses<Scope, Tail, Row, P>
        : never
      : S
    : never
  : F
  : never

type Select<D extends Database, T extends Tokens> = T extends [infer Head extends string, ...infer Rest extends Tokens]
  ? Uppercase<Head> extends "SELECT"
    ? Rest extends [infer Distinct extends string, ...infer Tail extends Tokens]
      ? Uppercase<Distinct> extends "DISTINCT" ? SelectFrom<D, Tail> : SelectFrom<D, Rest>
    : Failure<"Expected selected columns">
  : Failure<"Only SELECT is supported">
  : Failure<"Expected SELECT">

type Analyze<D extends Database, S extends string> = string extends S ? Failure<"Use a SQL string literal">
  : true extends IsUnion<S> ? Failure<"Use one SQL literal per call">
  : Tokenize<S> extends infer T ? T extends Tokens ? Select<D, T> : T
  : never

export type Validate<D extends Database, S extends string> = Analyze<D, S> extends Failure<infer Message>
  ? { readonly "SQL error": Message }
  : unknown

export type Row<D extends Database, S extends string> = Analyze<D, S> extends { readonly row: infer R extends object }
  ? Simplify<R>
  : never

export type Arguments<D extends Database, S extends string> = Analyze<D, S> extends { readonly params: infer P }
  ? keyof P extends never ? [params?: Readonly<Record<string, never>>] : [params: P]
  : [params?: unknown]
