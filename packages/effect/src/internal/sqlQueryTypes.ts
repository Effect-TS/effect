/** @internal */

// A deliberately small SQL grammar, evaluated entirely by TypeScript.
// Unsupported syntax produces an error instead of falling back to unknown rows.
export type Database = Readonly<Record<string, Readonly<Record<string, unknown>>>>

declare const sqlError: unique symbol
type Failure<Message extends string> = { readonly [sqlError]: Message }
type Tokens = ReadonlyArray<string>
type Step<Rest extends Tokens, Value> = { readonly rest: Rest; readonly value: Value }
type Simplify<A> = { readonly [K in keyof A]: A[K] }
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
type ColumnName<D extends Database, Table extends keyof D & string, Name extends string, Rest extends Tokens> =
  Uppercase<Name> extends LiteralKeyword ? Failure<`Column ${Name} requires a quoted identifier`>
    : Name extends keyof D[Table] ? Step<Rest, Name>
    : Failure<`Unknown column ${Name} on ${Table}`>

type Column<D extends Database, Table extends keyof D & string, T extends Tokens> = T extends
  [infer Qualifier extends string, ".", infer Name extends string, ...infer Rest extends Tokens]
  ? Qualifier extends Table ? ColumnName<D, Table, Name, Rest>
  : Failure<`Unknown table qualifier ${Qualifier}`>
  : T extends [infer Name extends string, ...infer Rest extends Tokens] ? ColumnName<D, Table, Name, Rest>
  : Failure<"Expected a column">

type Projection<D extends Database, Table extends keyof D & string, T extends Tokens> = T extends
  ["*"] | [Table, ".", "*"] ? D[Table]
  : Column<D, Table, T> extends infer C
    ? C extends Step<infer Rest, infer Name extends keyof D[Table] & string> ? Rest extends [] ? Pick<D[Table], Name>
      : Rest extends [infer As extends string, infer Alias extends string]
        ? Uppercase<As> extends "AS" ? Alias extends `${Start}${string}` ? { readonly [K in Alias]: D[Table][Name] }
          : Failure<"Expected an alias">
        : Failure<"Expected AS before an alias">
      : Failure<"Unsupported SELECT expression">
    : C
  : never

type AddProjection<D extends Database, Table extends keyof D & string, T extends Tokens, Row> =
  Projection<D, Table, T> extends infer P ? P extends Failure<string> ? P
    : keyof P & keyof Row extends never ? Simplify<Row & P>
    : Failure<"Duplicate result column; use AS aliases">
    : never

type Projections<
  D extends Database,
  Table extends keyof D & string,
  T extends Tokens,
  Row = {},
  Current extends Tokens = []
> = T extends [infer Head extends string, ...infer Rest extends Tokens]
  ? Head extends ","
    ? AddProjection<D, Table, Current, Row> extends infer Next
      ? Next extends Failure<string> ? Next : Projections<D, Table, Rest, Next>
    : never
  : Projections<D, Table, Rest, Row, [...Current, Head]>
  : AddProjection<D, Table, Current, Row>

type AddParameter<P, Name extends string, Value> = Simplify<P & { readonly [K in Name]: Value }> extends infer Next
  ? Name extends keyof Next ? [Next[Name]] extends [never] ? Failure<`Incompatible uses of parameter :${Name}`> : Next
  : never
  : never

type Parameter<T extends Tokens, P, Value> = T extends [`:${infer Name}`, ...infer Rest extends Tokens]
  ? AddParameter<P, Name, Value> extends infer Next ? Next extends Failure<string> ? Next : Step<Rest, Next>
  : never
  : Failure<"Expected a :named parameter">

type Condition<D extends Database, Table extends keyof D & string, T extends Tokens, P> = Column<D, Table, T> extends
  infer C
  ? C extends Step<infer Rest, infer Name extends keyof D[Table]>
    ? Rest extends [infer Op extends string, ...infer Tail extends Tokens]
      ? Op extends Comparison ? Parameter<Tail, P, D[Table][Name]>
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

type Conditions<D extends Database, Table extends keyof D & string, T extends Tokens, P = {}> =
  Condition<D, Table, T, P> extends infer C
    ? C extends Step<infer Rest, infer Next>
      ? Rest extends [infer And extends string, ...infer Tail extends Tokens]
        ? Uppercase<And> extends "AND" ? Conditions<D, Table, Tail, Next> : C
      : C
    : C
    : never

type Where<D extends Database, Table extends keyof D & string, T extends Tokens> = T extends
  [infer Head extends string, ...infer Rest extends Tokens]
  ? Uppercase<Head> extends "WHERE" ? Conditions<D, Table, Rest> : Step<T, {}>
  : Step<T, {}>

type Direction<T extends Tokens> = T extends [infer Head extends string, ...infer Rest extends Tokens]
  ? Uppercase<Head> extends "ASC" | "DESC" ? Rest : T
  : T

type OrderColumns<D extends Database, Table extends keyof D & string, T extends Tokens> = Column<D, Table, T> extends
  infer C
  ? C extends Step<infer Rest, unknown>
    ? Direction<Rest> extends infer End extends Tokens
      ? End extends [",", ...infer Tail extends Tokens] ? OrderColumns<D, Table, Tail> : End
    : never
  : C
  : never

type Order<D extends Database, Table extends keyof D & string, T extends Tokens> = T extends
  [infer Head extends string, ...infer Rest extends Tokens]
  ? Uppercase<Head> extends "ORDER"
    ? Rest extends [infer By extends string, ...infer Tail extends Tokens]
      ? Uppercase<By> extends "BY" ? OrderColumns<D, Table, Tail> : Failure<"Expected BY">
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

type Clauses<D extends Database, Table extends keyof D & string, T extends Tokens, Row> = Where<D, Table, T> extends
  infer W
  ? W extends Step<infer Rest, infer P>
    ? Order<D, Table, Rest> extends infer O
      ? O extends Tokens
        ? Limit<O, P> extends infer L ? L extends Step<infer Tail, infer Next> ? Finish<Tail, Row, Next> : L
        : never
      : O
    : never
  : W
  : never

type SelectFrom<D extends Database, T extends Tokens> = BeforeFrom<T> extends infer F
  ? F extends Step<infer Rest, infer Fields extends Tokens>
    ? Rest extends [infer Table extends string, ...infer Tail extends Tokens]
      ? Table extends keyof D
        ? Projections<D, Table, Fields> extends infer Row
          ? Row extends Failure<string> ? Row : Clauses<D, Table, Tail, Row>
        : never
      : Failure<`Unknown table ${Table}`>
    : Failure<"Expected a table after FROM">
  : F
  : never

type Select<D extends Database, T extends Tokens> = T extends [infer Head extends string, ...infer Rest extends Tokens]
  ? Uppercase<Head> extends "SELECT"
    ? Rest extends [infer Distinct extends string, ...infer Tail extends Tokens]
      ? Uppercase<Distinct> extends "DISTINCT" ? SelectFrom<D, Tail> : SelectFrom<D, Rest>
    : Failure<"Expected selected columns">
  : Failure<"Only SELECT is supported">
  : Failure<"Expected SELECT">

type IsUnion<T, Whole = T> = T extends Whole ? [Whole] extends [T] ? false : true : never
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
