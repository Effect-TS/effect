/**
 * The gold corpus: plans and Polars results from
 * test/fixtures/dataframe/generate_gold.py.
 */
import * as BigDecimal from "effect/BigDecimal"
import * as Fs from "node:fs"

export type TypeName =
  | "bool"
  | "i8"
  | "i16"
  | "i32"
  | "i64"
  | "u8"
  | "u16"
  | "u32"
  | "u64"
  | "f32"
  | "f64"
  | "utf8"
  | "null"
  | "date"
  | "datetime[us]"
  | "datetime[ms]"
  | "duration[us]"
  | "duration[ms]"
  | `decimal[${string}]`
  | `list<${string}>`
  | `struct<${string}>`

export interface Table {
  readonly fields: ReadonlyArray<{ readonly name: string; readonly type: TypeName }>
  readonly columns: { readonly [name: string]: ReadonlyArray<unknown> }
}

export type Expr =
  | { readonly over: Expr; readonly partitionBy: ReadonlyArray<Expr> }
  | { readonly col: string }
  | { readonly lit: unknown; readonly type?: TypeName }
  | { readonly fn: string; readonly args: ReadonlyArray<Expr>; readonly [option: string]: unknown }
  | { readonly agg: string; readonly arg?: Expr }

export type Op =
  | { readonly op: "filter"; readonly predicate: Expr }
  | { readonly op: "select" | "withColumns"; readonly exprs: { readonly [name: string]: Expr } }
  | { readonly op: "pick" | "omit"; readonly columns: ReadonlyArray<string> }
  | { readonly op: "rename"; readonly mapping: { readonly [name: string]: string } }
  | {
    readonly op: "sort"
    readonly keys: ReadonlyArray<{ readonly expr: Expr; readonly descending?: boolean }>
    readonly nullsLast?: boolean
  }
  | { readonly op: "head" | "tail"; readonly n: number }
  | { readonly op: "slice"; readonly offset: number; readonly length?: number }
  | { readonly op: "groupBy"; readonly keys: ReadonlyArray<string>; readonly aggs: { readonly [name: string]: Expr } }
  | { readonly op: "agg"; readonly aggs: { readonly [name: string]: Expr } }
  | {
    readonly op: "join"
    readonly right: string
    readonly on: ReadonlyArray<string>
    readonly how: "inner" | "left" | "full" | "semi" | "anti"
  }
  | { readonly op: "unique" | "dropNulls"; readonly columns?: ReadonlyArray<string> }
  | { readonly op: "concat"; readonly with: string }
  | {
    readonly op: "pivot"
    readonly on: string
    readonly index: ReadonlyArray<string>
    readonly values: string
    readonly aggregate: string
    readonly columns?: ReadonlyArray<string>
  }
  | { readonly op: "explode" | "unnest"; readonly column: string }
  | {
    readonly op: "unpivot"
    readonly index: ReadonlyArray<string>
    readonly on: ReadonlyArray<string>
    readonly variable?: string
    readonly value?: string
  }

export interface Case {
  readonly id: string
  readonly description: string
  readonly inputs: { readonly [name: string]: Table }
  readonly ops: ReadonlyArray<Op>
  readonly expected: Table
}

export interface Corpus {
  readonly polars: string
  readonly deviations: ReadonlyArray<string>
  readonly cases: ReadonlyArray<Case>
}

const load = (name: string): Corpus =>
  JSON.parse(Fs.readFileSync(new URL(`../../fixtures/dataframe/gold/${name}.json`, import.meta.url), "utf8"))

export const spec = (): Corpus => load("spec")
export const random = (): Corpus => load("random")
export const extended = (): Corpus => load("extended")

/** Splits `a:x,b:list<y>` on top-level commas. */
export const splitTop = (s: string): Array<string> => {
  const parts: Array<string> = []
  let depth = 0
  let current = ""
  for (const ch of s) {
    if (ch === "<") depth++
    if (ch === ">") depth--
    if (ch === "," && depth === 0) {
      parts.push(current)
      current = ""
    } else current += ch
  }
  if (current !== "") parts.push(current)
  return parts
}

/** The fields of a `struct<...>` type name. */
export const structFields = (type: string): Array<readonly [string, TypeName]> =>
  splitTop(type.slice(7, -1)).map((f) => {
    const at = f.indexOf(":")
    return [f.slice(0, at), f.slice(at + 1) as TypeName] as const
  })

/** Decodes a JSON-encoded gold value. */
export const decodeValue = (value: unknown, type: TypeName): unknown => {
  if (value === null) return null
  if (type.startsWith("decimal[")) return BigDecimal.fromStringUnsafe(value as string)
  if (type.startsWith("list<")) {
    return (value as ReadonlyArray<unknown>).map((v) => decodeValue(v, type.slice(5, -1) as TypeName))
  }
  if (type.startsWith("struct<")) {
    const out: Record<string, unknown> = {}
    for (const [name, t] of structFields(type)) out[name] = decodeValue((value as any)[name] ?? null, t)
    return out
  }
  switch (type) {
    case "f32":
    case "f64":
      if (typeof value === "string") {
        return ({ NaN: NaN, Infinity: Infinity, "-Infinity": -Infinity, "-0": -0 } as Record<string, number>)[value]
      }
      return value
    case "i64":
    case "u64":
      return BigInt(value as string)
    default:
      return value
  }
}
