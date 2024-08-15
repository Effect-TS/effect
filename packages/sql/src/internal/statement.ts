import * as Otel from "@opentelemetry/semantic-conventions"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import * as FiberRef from "effect/FiberRef"
import { dual, identity } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Stream from "effect/Stream"
import type * as Tracer from "effect/Tracer"
import type * as Connection from "../SqlConnection.js"
import type * as Error from "../SqlError.js"
import type * as Statement from "../Statement.js"

/** @internal */
export const FragmentId: Statement.FragmentId = Symbol.for(
  "@effect/sql/Fragment"
) as Statement.FragmentId

/** @internal */
export const isFragment = (u: unknown): u is Statement.Fragment =>
  typeof u === "object" && u !== null && FragmentId in u

/** @internal */
export const isParameter = (
  u: Statement.Segment
): u is Statement.Parameter => Predicate.isTagged(u, "Parameter")

/** @internal */
export const isCustom = <A extends Statement.Custom<any, any, any, any>>(
  kind: A["kind"]
) =>
(u: unknown): u is A => u instanceof CustomImpl && u.kind === kind

/** @internal */
export const currentTransformer = globalValue(
  "@effect/sql/Statement/currentTransformer",
  () =>
    FiberRef.unsafeMake(
      Option.none<Statement.Statement.Transformer>()
    )
)

/** @internal */
export const withTransformer = dual<
  (
    f: Statement.Statement.Transformer
  ) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>,
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    f: Statement.Statement.Transformer
  ) => Effect.Effect<A, E, R>
>(2, (effect, f) => Effect.locally(effect, currentTransformer, Option.some(f)))

/** @internal */
export const withTransformerDisabled = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  Effect.locally(effect, currentTransformer, Option.none())

/** @internal */
export const setTransformer = (
  f: Statement.Statement.Transformer
) => Layer.locallyScoped(currentTransformer, Option.some(f))

const withStatement = <A, X, E, R>(
  self: StatementPrimitive<A>,
  span: Tracer.Span,
  f: (statement: StatementPrimitive<A>) => Effect.Effect<X, E, R>
) =>
  Effect.withFiberRuntime<X, E, R>((fiber) => {
    const transform = fiber.getFiberRef(currentTransformer)
    if (transform._tag === "None") {
      return f(self)
    }
    return Effect.flatMap(
      transform.value(self, make(self.acquirer, self.compiler), fiber.getFiberRefs(), span) as Effect.Effect<
        StatementPrimitive<A>
      >,
      f
    )
  })

/** @internal */
export class StatementPrimitive<A> extends Effectable.Class<ReadonlyArray<A>, Error.SqlError>
  implements Statement.Statement<A>
{
  get [FragmentId]() {
    return identity
  }

  constructor(
    readonly segments: ReadonlyArray<Statement.Segment>,
    readonly acquirer: Connection.Connection.Acquirer,
    readonly compiler: Statement.Compiler,
    readonly spanAttributes: ReadonlyArray<readonly [string, unknown]>
  ) {
    super()
  }

  private withConnection<XA, E>(
    operation: string,
    f: (
      connection: Connection.Connection,
      sql: string,
      params: ReadonlyArray<Statement.Primitive>
    ) => Effect.Effect<XA, E>,
    withoutTransform = false
  ): Effect.Effect<XA, E | Error.SqlError> {
    return Effect.useSpan(
      "sql.execute",
      { kind: "client", captureStackTrace: false },
      (span) =>
        withStatement(this, span, (statement) => {
          const [sql, params] = statement.compile(withoutTransform)
          for (const [key, value] of this.spanAttributes) {
            span.attribute(key, value)
          }
          span.attribute(Otel.SEMATTRS_DB_OPERATION, operation)
          span.attribute(Otel.SEMATTRS_DB_STATEMENT, sql)
          return Effect.scoped(Effect.flatMap(this.acquirer, (_) => f(_, sql, params)))
        })
    )
  }

  get withoutTransform(): Effect.Effect<ReadonlyArray<A>, Error.SqlError> {
    return this.withConnection(
      "executeWithoutTransform",
      (connection, sql, params) => connection.executeWithoutTransform(sql, params),
      true
    )
  }

  get raw(): Effect.Effect<unknown, Error.SqlError> {
    return this.withConnection(
      "executeRaw",
      (connection, sql, params) => connection.executeRaw(sql, params),
      true
    )
  }

  get stream(): Stream.Stream<A, Error.SqlError> {
    return Stream.unwrapScoped(Effect.flatMap(
      Effect.makeSpanScoped("sql.execute", { kind: "client", captureStackTrace: false }),
      (span) =>
        withStatement(this, span, (statement) => {
          const [sql, params] = statement.compile()
          for (const [key, value] of this.spanAttributes) {
            span.attribute(key, value)
          }
          span.attribute(Otel.SEMATTRS_DB_OPERATION, "executeStream")
          span.attribute(Otel.SEMATTRS_DB_STATEMENT, sql)
          return Effect.map(this.acquirer, (_) => _.executeStream(sql, params))
        })
    ))
  }

  get values(): Effect.Effect<
    ReadonlyArray<ReadonlyArray<Statement.Primitive>>,
    Error.SqlError
  > {
    return this.withConnection("executeValues", (connection, sql, params) => connection.executeValues(sql, params))
  }

  get unprepared(): Effect.Effect<ReadonlyArray<A>, Error.SqlError> {
    return this.withConnection(
      "executeUnprepared",
      (connection, sql, params) => connection.executeUnprepared(sql, params)
    )
  }

  compile(withoutTransform?: boolean | undefined) {
    return this.compiler.compile(this, withoutTransform ?? false)
  }
  commit(): Effect.Effect<ReadonlyArray<A>, Error.SqlError> {
    return this.withConnection("execute", (connection, sql, params) => connection.execute(sql, params))
  }
  toJSON() {
    const [sql, params] = this.compile()
    return {
      _id: "@effect/sql/Statement",
      segments: this.segments,
      sql,
      params
    }
  }
}

class FragmentImpl implements Statement.Fragment {
  get [FragmentId]() {
    return identity
  }
  constructor(readonly segments: ReadonlyArray<Statement.Segment>) {}
}

class LiteralImpl implements Statement.Literal {
  readonly _tag = "Literal"
  constructor(
    readonly value: string,
    readonly params?: ReadonlyArray<Statement.Primitive>
  ) {}
}

class IdentifierImpl implements Statement.Identifier {
  readonly _tag = "Identifier"
  constructor(readonly value: string) {}
}

class ParameterImpl implements Statement.Parameter {
  readonly _tag = "Parameter"
  constructor(readonly value: Statement.Primitive) {}
}

class ArrayHelperImpl implements Statement.ArrayHelper {
  readonly _tag = "ArrayHelper"
  constructor(readonly value: ReadonlyArray<Statement.Primitive>) {}
}

function identifierWrap(sql: string | Statement.Identifier | Statement.Fragment): string | Statement.Fragment {
  return typeof sql === "string"
    ? sql
    : FragmentId in sql
    ? sql
    : new FragmentImpl([sql])
}

class RecordInsertHelperImpl implements Statement.RecordInsertHelper {
  readonly _tag = "RecordInsertHelper"
  constructor(
    readonly value: ReadonlyArray<Record<string, Statement.Primitive>>,
    readonly returningIdentifier: string | Statement.Fragment | undefined
  ) {}
  returning(sql: string | Statement.Identifier | Statement.Fragment) {
    return new RecordInsertHelperImpl(this.value, identifierWrap(sql))
  }
}

class RecordUpdateHelperImpl implements Statement.RecordUpdateHelper {
  readonly _tag = "RecordUpdateHelper"
  constructor(
    readonly value: ReadonlyArray<Record<string, Statement.Primitive>>,
    readonly alias: string,
    readonly returningIdentifier: string | Statement.Fragment | undefined
  ) {}
  returning(sql: string | Statement.Identifier | Statement.Fragment) {
    return new RecordUpdateHelperImpl(this.value, this.alias, identifierWrap(sql))
  }
}

class RecordUpdateHelperSingleImpl implements Statement.RecordUpdateHelperSingle {
  readonly _tag = "RecordUpdateHelperSingle"
  constructor(
    readonly value: Record<string, Statement.Primitive>,
    readonly omit: ReadonlyArray<string>,
    readonly returningIdentifier: string | Statement.Fragment | undefined
  ) {}
  returning(sql: string | Statement.Identifier | Statement.Fragment) {
    return new RecordUpdateHelperSingleImpl(this.value, this.omit, identifierWrap(sql))
  }
}

class CustomImpl<T extends string, A, B, C> implements Statement.Custom<T, A, B, C> {
  readonly _tag = "Custom"
  constructor(
    readonly kind: T,
    readonly i0: A,
    readonly i1: B,
    readonly i2: C
  ) {}
}

/** @internal */
export const custom = <C extends Statement.Custom<any, any, any, any>>(
  kind: C["kind"]
) =>
(i0: C["i0"], i1: C["i1"], i2: C["i2"]): Statement.Fragment => new FragmentImpl([new CustomImpl(kind, i0, i1, i2)])

const isHelper = (u: unknown): u is Statement.Helper =>
  u instanceof ArrayHelperImpl ||
  u instanceof RecordInsertHelperImpl ||
  u instanceof RecordUpdateHelperImpl ||
  u instanceof RecordUpdateHelperSingleImpl ||
  u instanceof IdentifierImpl

const constructorCache = globalValue(
  "@effect/sql/Statement/constructorCache",
  () => new WeakMap<Connection.Connection.Acquirer, Statement.Constructor>()
)

/** @internal */
export const make = (
  acquirer: Connection.Connection.Acquirer,
  compiler: Statement.Compiler,
  spanAttributes: ReadonlyArray<readonly [string, unknown]> = []
): Statement.Constructor => {
  if (constructorCache.has(acquirer)) {
    return constructorCache.get(acquirer)!
  }
  const self = Object.assign(
    function sql(strings: unknown, ...args: Array<any>): any {
      if (Array.isArray(strings) && "raw" in strings) {
        return statement(
          acquirer,
          compiler,
          strings as TemplateStringsArray,
          args,
          spanAttributes
        )
      } else if (typeof strings === "string") {
        return new IdentifierImpl(strings)
      }

      throw "absurd"
    },
    {
      unsafe<A extends object = Connection.Row>(
        sql: string,
        params?: ReadonlyArray<Statement.Primitive>
      ) {
        return new StatementPrimitive<A>(
          [new LiteralImpl(sql, params)],
          acquirer,
          compiler,
          spanAttributes
        )
      },
      literal(sql: string) {
        return new FragmentImpl([new LiteralImpl(sql)])
      },
      in: in_,
      insert(value: any) {
        return new RecordInsertHelperImpl(
          Array.isArray(value) ? value : [value],
          undefined
        )
      },
      update(value: any, omit: any) {
        return new RecordUpdateHelperSingleImpl(value, omit ?? [], undefined)
      },
      updateValues(value: any, alias: any) {
        return new RecordUpdateHelperImpl(value, alias, undefined)
      },
      and,
      or,
      csv,
      join,
      onDialect(options: Record<Statement.Dialect, any>) {
        return options[compiler.dialect]()
      },
      onDialectOrElse(options: any) {
        return options[compiler.dialect] !== undefined ? options[compiler.dialect]() : options.orElse()
      }
    }
  )

  constructorCache.set(acquirer, self)

  return self
}

/** @internal */
export const statement = (
  acquirer: Connection.Connection.Acquirer,
  compiler: Statement.Compiler,
  strings: TemplateStringsArray,
  args: Array<Statement.Argument>,
  spanAttributes: ReadonlyArray<readonly [string, unknown]>
): Statement.Statement<Connection.Row> => {
  const segments: Array<Statement.Segment> = strings[0].length > 0 ? [new LiteralImpl(strings[0])] : []

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (isFragment(arg)) {
      for (const segment of arg.segments) {
        segments.push(segment)
      }
    } else if (isHelper(arg)) {
      segments.push(arg)
    } else {
      segments.push(new ParameterImpl(arg))
    }

    if (strings[i + 1].length > 0) {
      segments.push(new LiteralImpl(strings[i + 1]))
    }
  }

  return new StatementPrimitive<Connection.Row>(segments, acquirer, compiler, spanAttributes)
}

/** @internal */
export const unsafeFragment = (
  sql: string,
  params?: ReadonlyArray<Statement.Primitive>
): Statement.Fragment => new FragmentImpl([new LiteralImpl(sql, params)])

function convertLiteralOrFragment(clause: string | Statement.Fragment): Array<Statement.Segment> {
  if (typeof clause === "string") {
    return [new LiteralImpl(clause)]
  }
  return clause.segments as Array<Statement.Segment>
}

function in_(values: ReadonlyArray<Statement.Primitive>): Statement.ArrayHelper
function in_(column: string, values: ReadonlyArray<Statement.Primitive>): Statement.Fragment
function in_(): Statement.Fragment | Statement.ArrayHelper {
  if (arguments.length === 1) {
    return new ArrayHelperImpl(arguments[0])
  }
  const column = arguments[0]
  const values = arguments[1]
  return values.length === 0 ? unsafeFragment("1=0") : new FragmentImpl([
    new IdentifierImpl(column),
    new LiteralImpl(" IN "),
    new ArrayHelperImpl(values)
  ])
}

/** @internal */
export function join(literal: string, addParens = true, fallback = "") {
  const literalStatement = new LiteralImpl(literal)

  return (clauses: ReadonlyArray<string | Statement.Fragment>): Statement.Fragment => {
    if (clauses.length === 0) {
      return unsafeFragment(fallback)
    } else if (clauses.length === 1) {
      return new FragmentImpl(convertLiteralOrFragment(clauses[0]))
    }

    const segments: Array<Statement.Segment> = []

    if (addParens) {
      segments.push(new LiteralImpl("("))
    }

    segments.push.apply(segments, convertLiteralOrFragment(clauses[0]))

    for (let i = 1; i < clauses.length; i++) {
      segments.push(literalStatement)
      segments.push.apply(segments, convertLiteralOrFragment(clauses[i]))
    }

    if (addParens) {
      segments.push(new LiteralImpl(")"))
    }

    return new FragmentImpl(segments)
  }
}

/** @internal */
export const and = join(" AND ", true, "1=1")

/** @internal */
export const or = join(" OR ", true, "1=1")

const csvRaw = join(", ", false)

/** @internal */
export const csv: {
  (values: ReadonlyArray<string | Statement.Fragment>): Statement.Fragment
  (prefix: string, values: ReadonlyArray<string | Statement.Fragment>): Statement.Fragment
} = (
  ...args:
    | [values: ReadonlyArray<string | Statement.Fragment>]
    | [prefix: string, values: ReadonlyArray<string | Statement.Fragment>]
) => {
  if (args[args.length - 1].length === 0) {
    return unsafeFragment("")
  }

  if (args.length === 1) {
    return csvRaw(args[0])
  }

  return new FragmentImpl([
    new LiteralImpl(`${args[0]} `),
    ...csvRaw(args[1]).segments
  ])
}

const statementCacheSymbol = Symbol.for("@effect/sql/Statement/statementCache")
const statementCacheNoTransformSymbol = Symbol.for("@effect/sql/Statement/statementCacheNoTransform")

/** @internal */
class CompilerImpl implements Statement.Compiler {
  constructor(
    readonly dialect: Statement.Dialect,
    readonly parameterPlaceholder: (index: number) => string,
    readonly onIdentifier: (value: string, withoutTransform: boolean) => string,
    readonly onRecordUpdate: (
      placeholders: string,
      alias: string,
      columns: string,
      values: ReadonlyArray<ReadonlyArray<Statement.Primitive>>,
      returning: readonly [sql: string, params: ReadonlyArray<Statement.Primitive>] | undefined
    ) => readonly [sql: string, binds: ReadonlyArray<Statement.Primitive>],
    readonly onCustom: (
      type: Statement.Custom<string, unknown, unknown>,
      placeholder: () => string,
      withoutTransform: boolean
    ) => readonly [sql: string, binds: ReadonlyArray<Statement.Primitive>],
    readonly onInsert?: (
      columns: ReadonlyArray<string>,
      placeholders: string,
      values: ReadonlyArray<ReadonlyArray<Statement.Primitive>>,
      returning: readonly [sql: string, params: ReadonlyArray<Statement.Primitive>] | undefined
    ) => readonly [sql: string, binds: ReadonlyArray<Statement.Primitive>],
    readonly onRecordUpdateSingle?: (
      columns: ReadonlyArray<string>,
      values: ReadonlyArray<Statement.Primitive>,
      returning: readonly [sql: string, params: ReadonlyArray<Statement.Primitive>] | undefined
    ) => readonly [sql: string, binds: ReadonlyArray<Statement.Primitive>]
  ) {}

  compile(
    statement: Statement.Fragment,
    withoutTransform = false,
    placeholderOverride?: () => string
  ): readonly [sql: string, binds: ReadonlyArray<Statement.Primitive>] {
    const cacheSymbol = withoutTransform ? statementCacheNoTransformSymbol : statementCacheSymbol
    if (cacheSymbol in statement) {
      return (statement as any)[cacheSymbol]
    }

    const segments = statement.segments
    const len = segments.length

    let sql = ""
    const binds: Array<Statement.Primitive> = []
    let placeholderCount = 0
    const placeholder = placeholderOverride ?? (() => this.parameterPlaceholder(++placeholderCount))
    const placeholderNoIncrement = () => this.parameterPlaceholder(placeholderCount)

    for (let i = 0; i < len; i++) {
      const segment = segments[i]

      switch (segment._tag) {
        case "Literal": {
          sql += segment.value
          if (segment.params) {
            binds.push.apply(binds, segment.params as any)
          }
          break
        }

        case "Identifier": {
          sql += this.onIdentifier(segment.value, withoutTransform)
          break
        }

        case "Parameter": {
          sql += placeholder()
          binds.push(segment.value)
          break
        }

        case "ArrayHelper": {
          sql += `(${generatePlaceholder(placeholder, segment.value.length)()})`
          binds.push.apply(binds, segment.value as any)
          break
        }

        case "RecordInsertHelper": {
          const keys = Object.keys(segment.value[0])

          if (this.onInsert) {
            const [s, b] = this.onInsert(
              keys.map((_) => this.onIdentifier(_, withoutTransform)),
              placeholders(
                generatePlaceholder(placeholder, keys.length),
                segment.value.length
              ),
              segment.value.map((record) =>
                keys.map((key) =>
                  extractPrimitive(record[key], this.onCustom, placeholderNoIncrement, withoutTransform)
                )
              ),
              typeof segment.returningIdentifier === "string"
                ? [segment.returningIdentifier, []]
                : segment.returningIdentifier
                ? this.compile(segment.returningIdentifier, withoutTransform, placeholder)
                : undefined
            )
            sql += s
            binds.push.apply(binds, b as any)
          } else {
            sql += `${
              generateColumns(
                keys,
                this.onIdentifier,
                withoutTransform
              )
            } VALUES ${
              placeholders(
                generatePlaceholder(placeholder, keys.length),
                segment.value.length
              )
            }`

            for (let i = 0, len = segment.value.length; i < len; i++) {
              for (let j = 0, len = keys.length; j < len; j++) {
                binds.push(
                  extractPrimitive(
                    segment.value[i]?.[keys[j]] ?? null,
                    this.onCustom,
                    placeholderNoIncrement,
                    withoutTransform
                  )
                )
              }
            }

            if (typeof segment.returningIdentifier === "string") {
              sql += ` RETURNING ${segment.returningIdentifier}`
            } else if (segment.returningIdentifier) {
              sql += " RETURNING "
              const [s, b] = this.compile(segment.returningIdentifier, withoutTransform, placeholder)
              sql += s
              binds.push.apply(binds, b as any)
            }
          }
          break
        }

        case "RecordUpdateHelperSingle": {
          let keys = Object.keys(segment.value)
          if (segment.omit.length > 0) {
            keys = keys.filter((key) => !segment.omit.includes(key))
          }
          if (this.onRecordUpdateSingle) {
            const [s, b] = this.onRecordUpdateSingle(
              keys.map((_) => this.onIdentifier(_, withoutTransform)),
              keys.map((key) =>
                extractPrimitive(
                  segment.value[key],
                  this.onCustom,
                  placeholderNoIncrement,
                  withoutTransform
                )
              ),
              typeof segment.returningIdentifier === "string"
                ? [segment.returningIdentifier, []]
                : segment.returningIdentifier
                ? this.compile(segment.returningIdentifier, withoutTransform, placeholder)
                : undefined
            )
            sql += s
            binds.push.apply(binds, b as any)
          } else {
            for (let i = 0, len = keys.length; i < len; i++) {
              const column = this.onIdentifier(keys[i], withoutTransform)
              if (i === 0) {
                sql += `${column} = ${placeholder()}`
              } else {
                sql += `, ${column} = ${placeholder()}`
              }
              binds.push(
                extractPrimitive(
                  segment.value[keys[i]],
                  this.onCustom,
                  placeholderNoIncrement,
                  withoutTransform
                )
              )
            }
            if (typeof segment.returningIdentifier === "string") {
              if (this.dialect === "mssql") {
                sql += ` OUTPUT ${segment.returningIdentifier === "*" ? "INSERTED.*" : segment.returningIdentifier}`
              } else {
                sql += ` RETURNING ${segment.returningIdentifier}`
              }
            } else if (segment.returningIdentifier) {
              sql += this.dialect === "mssql" ? " OUTPUT " : " RETURNING "
              const [s, b] = this.compile(segment.returningIdentifier, withoutTransform, placeholder)
              sql += s
              binds.push.apply(binds, b as any)
            }
          }
          break
        }

        case "RecordUpdateHelper": {
          const keys = Object.keys(segment.value[0])
          const [s, b] = this.onRecordUpdate(
            placeholders(
              generatePlaceholder(placeholder, keys.length),
              segment.value.length
            ),
            segment.alias,
            generateColumns(keys, this.onIdentifier, withoutTransform),
            segment.value.map((record) =>
              keys.map((key) =>
                extractPrimitive(record?.[key], this.onCustom, placeholderNoIncrement, withoutTransform)
              )
            ),
            typeof segment.returningIdentifier === "string"
              ? [segment.returningIdentifier, []]
              : segment.returningIdentifier
              ? this.compile(segment.returningIdentifier, withoutTransform, placeholder)
              : undefined
          )
          sql += s
          binds.push.apply(binds, b as any)
          break
        }

        case "Custom": {
          const [s, b] = this.onCustom(segment, placeholder, withoutTransform)
          sql += s
          binds.push.apply(binds, b as any)
          break
        }
      }
    }

    const result = [sql, binds] as const
    if (placeholderOverride !== undefined) {
      return result
    }
    return (statement as any)[cacheSymbol] = result
  }
}

/** @internal */
export const makeCompiler = <C extends Statement.Custom<any, any, any, any> = any>(
  options: {
    readonly dialect: Statement.Dialect
    readonly placeholder: (index: number) => string
    readonly onIdentifier: (value: string, withoutTransform: boolean) => string
    readonly onRecordUpdate: (
      placeholders: string,
      alias: string,
      columns: string,
      values: ReadonlyArray<ReadonlyArray<Statement.Primitive>>,
      returning: readonly [sql: string, params: ReadonlyArray<Statement.Primitive>] | undefined
    ) => readonly [sql: string, params: ReadonlyArray<Statement.Primitive>]
    readonly onCustom: (
      type: C,
      placeholder: () => string,
      withoutTransform: boolean
    ) => readonly [sql: string, params: ReadonlyArray<Statement.Primitive>]
    readonly onInsert?: (
      columns: ReadonlyArray<string>,
      placeholders: string,
      values: ReadonlyArray<ReadonlyArray<Statement.Primitive>>,
      returning: readonly [sql: string, params: ReadonlyArray<Statement.Primitive>] | undefined
    ) => readonly [sql: string, binds: ReadonlyArray<Statement.Primitive>]
    readonly onRecordUpdateSingle?: (
      columns: ReadonlyArray<string>,
      values: ReadonlyArray<Statement.Primitive>,
      returning: readonly [sql: string, params: ReadonlyArray<Statement.Primitive>] | undefined
    ) => readonly [sql: string, params: ReadonlyArray<Statement.Primitive>]
  }
): Statement.Compiler =>
  new CompilerImpl(
    options.dialect,
    options.placeholder,
    options.onIdentifier,
    options.onRecordUpdate,
    options.onCustom as any,
    options.onInsert,
    options.onRecordUpdateSingle
  )

const placeholders = (evaluate: () => string, count: number): string => {
  if (count === 0) {
    return ""
  }

  let result = `(${evaluate()})`
  for (let i = 1; i < count; i++) {
    result += `,(${evaluate()})`
  }

  return result
}

const generatePlaceholder = (evaluate: () => string, len: number) => {
  if (len === 0) {
    return () => ""
  } else if (len === 1) {
    return evaluate
  }

  return () => {
    let result = evaluate()
    for (let i = 1; i < len; i++) {
      result += `,${evaluate()}`
    }

    return result
  }
}

const generateColumns = (
  keys: ReadonlyArray<string>,
  escape: (_: string, withoutTransform: boolean) => string,
  withoutTransform: boolean
) => {
  if (keys.length === 0) {
    return "()"
  }

  let str = `(${escape(keys[0], withoutTransform)}`
  for (let i = 1; i < keys.length; i++) {
    str += `,${escape(keys[i], withoutTransform)}`
  }
  return str + ")"
}

/** @internal */
export function defaultEscape(c: string) {
  const re = new RegExp(c, "g")
  const double = c + c
  const dot = c + "." + c
  return function(str: string) {
    return c + str.replace(re, double).replace(/\./g, dot) + c
  }
}

/** @internal */
export const primitiveKind = (value: Statement.Primitive): Statement.PrimitiveKind => {
  switch (typeof value) {
    case "string":
      return "string"
    case "number":
      return "number"
    case "boolean":
      return "boolean"
    case "bigint":
      return "bigint"
    case "undefined":
      return "null"
  }

  if (value === null) {
    return "null"
  } else if (value instanceof Date) {
    return "Date"
  } else if (value instanceof Uint8Array) {
    return "Uint8Array"
  } else if (value instanceof Int8Array) {
    return "Int8Array"
  }

  return "string"
}

const extractPrimitive = (
  value: Statement.Primitive | Statement.Fragment | undefined,
  onCustom: (
    type: Statement.Custom<string, unknown, unknown>,
    placeholder: () => string,
    withoutTransform: boolean
  ) => readonly [sql: string, binds: ReadonlyArray<Statement.Primitive>],
  placeholder: () => string,
  withoutTransform: boolean
): Statement.Primitive => {
  if (value === undefined) {
    return null
  } else if (isFragment(value)) {
    const head = value.segments[0]
    if (head._tag === "Custom") {
      const compiled = onCustom(head, placeholder, withoutTransform)
      return compiled[1][0] ?? null
    } else if (head._tag === "Parameter") {
      return head.value
    }
    return null
  }
  return value
}

const escapeSqlite = defaultEscape("\"")

/** @internal */
export const makeCompilerSqlite = (transform?: (_: string) => string) =>
  makeCompiler({
    dialect: "sqlite",
    placeholder(_) {
      return "?"
    },
    onIdentifier: transform ?
      function(value, withoutTransform) {
        return withoutTransform ? escapeSqlite(value) : escapeSqlite(transform(value))
      } :
      escapeSqlite,
    onRecordUpdate() {
      return ["", []]
    },
    onCustom() {
      return ["", []]
    }
  })

/** @internal */
export const defaultTransforms = (
  transformer: (str: string) => string,
  nested = true
) => {
  const transformValue = (value: any) => {
    if (Array.isArray(value)) {
      if (value.length === 0 || value[0].constructor !== Object) {
        return value
      }
      return array(value)
    } else if (value?.constructor === Object) {
      return transformObject(value)
    }
    return value
  }

  const transformObject = (obj: Record<string, any>): any => {
    const newObj: Record<string, any> = {}
    for (const key in obj) {
      newObj[transformer(key)] = transformValue(obj[key])
    }
    return newObj
  }

  const transformArrayNested = <A extends object>(
    rows: ReadonlyArray<A>
  ): ReadonlyArray<A> => {
    const newRows: Array<A> = new Array(rows.length)
    for (let i = 0, len = rows.length; i < len; i++) {
      const row = rows[i]
      const obj: any = {}
      for (const key in row) {
        obj[transformer(key)] = transformValue(row[key])
      }
      newRows[i] = obj
    }
    return newRows
  }

  const transformArray = <A extends object>(
    rows: ReadonlyArray<A>
  ): ReadonlyArray<A> => {
    const newRows: Array<A> = new Array(rows.length)
    for (let i = 0, len = rows.length; i < len; i++) {
      const row = rows[i]
      const obj: any = {}
      for (const key in row) {
        obj[transformer(key)] = row[key]
      }
      newRows[i] = obj
    }
    return newRows
  }

  const array = nested ? transformArrayNested : transformArray

  return {
    value: transformValue,
    object: transformObject,
    array
  } as const
}
