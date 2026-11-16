# DataFrame contract assertions

Reference for maintainers reviewing the DataFrame layer. This is an assertion-to-test inventory, not a claim of complete standards or API coverage. Existing regressions remain in their conventional suites.

## Authority and classification

The approved API baseline is commit `d7121ccbd69f9f437ac60b09a704f216c0ca44ee`. Links below pin that immutable revision of `packages/effect/src/dataframe`; API documentation, not an external dataframe standard, defines the contract. The source symbol locates the surrounding documentation; it is not an assertion that every implementation detail is normative.

- **C**: approved public API contract; **P**: local regression/policy detail (not an external requirement).
- **I**: interoperability/differential evidence; an independent engine is an oracle, not the authority for this API.
- No row is an external normative requirement. Gaps and exclusions are explicit below.
- IDs are permanent: retain them when tests move or titles change; do not renumber. Test comments resolve to this inventory and its pinned source.

## Runtime assertions

The assertion column is the exact leaf test title. Combine it with the file and surrounding describe blocks to select the test; each listed title is unique within its file. A row covers the concrete inputs/assertions in that test, not all possible values of the API.

### `DataFrame.test.ts`

| ID      | Kind | Assertion / exact test title                                                          | API source                                                                                                                                                       |
| ------- | ---- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DF-C001 | C    | fromRows maps schema fields to Arrow types                                            | [DataFrame.fromRows](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L192)          |
| DF-C002 | C    | fromRows takes per-column type overrides                                              | [DataFrame.fromRows](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L192)          |
| DF-C003 | C    | fromRows builds decimal columns from options.types                                    | [DataFrame.fromRows](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L192)          |
| DF-C004 | C    | fromRows rejects overrides that can't hold the field's values                         | [DataFrame.fromRows](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L192)          |
| DF-C005 | C    | fromRows rejects schemas without a column type                                        | [DataFrame.fromRows](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L192)          |
| DF-C006 | C    | fromColumns keeps typed array element types                                           | [DataFrame.fromColumns](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L274)       |
| DF-C007 | C    | fromColumns rejects columns of different lengths                                      | [DataFrame.fromColumns](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L274)       |
| DF-C008 | C    | empty has the schema's columns and no rows                                            | [DataFrame.empty](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L360)             |
| DF-C009 | C    | returns the frame typed by the schema, in schema order                                | [DataFrame.validate](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L396)          |
| DF-C010 | C    | fails on missing columns, wrong types, unexpected nulls and values the schema rejects | [DataFrame.validate](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L396)          |
| DF-C011 | C    | reads timestamps with a UTC time zone as DateTime.Utc                                 | [DataFrame.validate](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L396)          |
| DF-C012 | C    | converts columns to the types fromRows gives the schema, exactly                      | [DataFrame.validate](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L396)          |
| DF-C013 | C    | round-trips through the IPC stream format                                             | [DataFrame.toArrowTable](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L448)      |
| DF-C014 | C    | decodes IPC stream bytes into a frame per batch                                       | [DataFrame.decodeArrowStream](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L336) |
| DF-C015 | C    | exports late-selected columns                                                         | [DataFrame.toArrowTable](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L448)      |
| DF-C016 | C    | imports a table without batches with the nullability of its fields                    | [DataFrame.fromArrowTable](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L314)    |
| DF-C017 | C    | imports sliced list columns with only their own elements                              | [DataFrame.fromArrowTable](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L314)    |
| DF-C018 | C    | compare structurally, NaN included                                                    | [DataFrame.equals](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L478)            |
| DF-C019 | C    | iterate as rows                                                                       | [DataFrame.DataFrame](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L81)          |
| DF-C020 | P    | format as a text table                                                                | [DataFrame.format](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L467)            |
| DF-C021 | C    | reuses compatible numeric buffers across Arrow conversion                             | [DataFrame layouts](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L6-L9)          |
| DF-C022 | C    | fromRows checks rows against the schema's refinements, literals and row checks        | [DataFrame.fromRows](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L192)          |
| DF-C023 | C    | fromRows, empty and validate reject schemas that transform their rows                 | [DataFrame.fromRows](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L192)          |
| DF-C024 | P    | builds values only for the fields the schema constrains                               | [DataFrame.validate](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L396)          |
| DF-C025 | C    | takes an Arrow schema, converting the frame to its columns                            | [DataFrame.validate](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L396)          |
| DF-C026 | C    | rejects Arrow schemas with types a table can't declare                                | [DataFrame.validate](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L396)          |
| DF-C027 | C    | converts dates and times to the declared unit                                         | [DataFrame.validate](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L396)          |
| DF-C028 | C    | column gives a column's buffers and values without building rows                      | [DataFrame layouts](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L6-L9)          |
| DF-C029 | C    | fromRows returns a frame that validates against the same declaration                  | [DataFrame.fromRows](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L192)          |
| DF-C030 | C    | a null member of a union keeps the checks of the other members                        | [DataFrame.fromRows](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L192)          |
| DF-C031 | C    | checks see stored values as the schema writes them, missing ones included             | [DataFrame.fromRows](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L192)          |
| DF-C032 | C    | accepts the stored values that Schema.is accepts                                      | [DataFrame.fromRows](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L192)          |

DF-C021 checks a single, unsliced, non-null batch of Int32 and Float64 columns: import/export preserves the backing buffers, byte offsets and byte lengths, as well as values. It does not require typed-array wrapper identity or mutation-based aliasing. The compatible fixed-width layouts are described in Apache Arrow’s [Columnar format](https://github.com/apache/arrow/blob/ee4d09ebef61c663c1efbfa4c18e518a03b798be/docs/source/format/Columnar.rst#fixed-size-primitive-layout) and [Schema.fbs](https://github.com/apache/arrow/blob/ee4d09ebef61c663c1efbfa4c18e518a03b798be/format/Schema.fbs); the no-copy adapter promise is the Effect API contract, not a requirement that Arrow imposes on every adapter.

### `Query.test.ts`

| ID      | Kind | Assertion / exact test title                                                                   | API source                                                                                                                                                    |
| ------- | ---- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DF-Q001 | C    | is an Effect producing a frame                                                                 | [Query.Query](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L108)                  |
| DF-Q002 | C    | expression callbacks run once at construction, not on execution                                | [Query.select](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L7-L18)               |
| DF-Q003 | C    | does no work until it runs                                                                     | [Query.Query](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L108)                  |
| DF-Q004 | C    | reads each table once per run, from effects too                                                | [Catalog.Catalog](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Catalog.ts#L6-L19)          |
| DF-Q005 | C    | tables can be queries (views)                                                                  | [Catalog.Catalog](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Catalog.ts#L6-L19)          |
| DF-Q006 | C    | checks tables against their declared columns                                                   | [Query.table](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L254)                  |
| DF-Q007 | C    | narrows tables to their declared columns                                                       | [Query.table](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L254)                  |
| DF-Q008 | C    | fails with DataFrameError on invalid expressions                                               | [DataFrame.DataFrameError](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L137) |
| DF-Q009 | C    | decimal results fail instead of overflowing 64 bits                                            | [Expr.Expr](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Expr.ts#L24-L48)                  |
| DF-Q010 | C    | round rejects negative or fractional places                                                    | [Expr.round](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Expr.ts#L455)                    |
| DF-Q011 | C    | slice takes an offset and a length; negative offsets count from the end                        | [Query.slice](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L391)                  |
| DF-Q012 | C    | append stacks rows; dropNulls removes incomplete rows                                          | [Query.append](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L492)                 |
| DF-Q013 | C    | joins on several keys                                                                          | [Query.join](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L680)                   |
| DF-Q014 | C    | cast reports values that don't fit as null                                                     | [Expr.cast](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Expr.ts#L685)                     |
| DF-Q015 | C    | implicit conversions to a common type fail on values it can't hold                             | [Expr.Expr](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Expr.ts#L24-L48)                  |
| DF-Q016 | C    | temporal operands of mixed units meet in the coarser unit, as in Polars                        | [Expr.Expr](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Expr.ts#L24-L48)                  |
| DF-Q017 | P    | shows the rewritten plan                                                                       | [Query.explain](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L321)                |
| DF-Q018 | P    | pushes key predicates below groups and through renames                                         | [Query.explain](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L321)                |
| DF-Q019 | P    | keeps predicates on join keys off the right side, whose keys the join drops                    | [Query.explain](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L321)                |
| DF-Q020 | P    | keeps predicates above left joins when they read the right side                                | [Query.explain](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L321)                |
| DF-Q021 | C    | are plain data                                                                                 | [Plan.Node](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Plan.ts#L588)                     |
| DF-Q022 | C    | encode to JSON without losing literal types                                                    | [Plan.NodeFromJson](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Plan.ts#L1103)            |
| DF-Q023 | C    | round-trip through JSON with their inputs                                                      | [Plan.NodeFromJson](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Plan.ts#L1103)            |
| DF-Q024 | C    | reject malformed JSON when decoding                                                            | [Plan.NodeFromJson](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Plan.ts#L1103)            |
| DF-Q025 | C    | fail at run time on the wrong number of arguments                                              | [Plan.Expression](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Plan.ts#L380)               |
| DF-Q026 | C    | expressions convert to and from plans                                                          | [Expr.toPlan](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Expr.ts#L251)                   |
| DF-Q027 | C    | a slice that has its rows pulls no further batch                                               | [Catalog.Catalog](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Catalog.ts#L6-L19)          |
| DF-Q028 | C    | decimal sums don't depend on batch boundaries                                                  | [Expr.sum](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Expr.ts#L827)                      |
| DF-Q029 | C    | batches convert to the declared column types; undeclared, they must share their columns        | [Catalog.Catalog](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Catalog.ts#L6-L19)          |
| DF-Q030 | C    | results over inputs of different types are those over their concatenation, streamed or not     | [Catalog.Catalog](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Catalog.ts#L6-L19)          |
| DF-Q031 | C    | zero-row batches aggregate like an empty table                                                 | [Query.aggregate](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L653)              |
| DF-Q032 | C    | results without rows keep the types of their columns                                           | [Query.stream](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L310)                 |
| DF-Q033 | C    | results without rows are those in memory, or fail when their columns are undeclared and unread | [Query.stream](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L310)                 |
| DF-Q034 | C    | reads a table named twice once per run, only if its batches are needed                         | [Catalog.Catalog](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Catalog.ts#L6-L19)          |
| DF-Q035 | C    | explain shows the plan without reading the stream                                              | [Query.explain](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L321)                |
| DF-Q036 | C    | a head stops reading the stream                                                                | [Query.head](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L407)                   |
| DF-Q037 | C    | Query.stream emits a frame per non-empty batch                                                 | [Query.stream](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L310)                 |
| DF-Q038 | C    | sorts by every column type, in both directions, nulls first or last                            | [Query.sort](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L352)                   |
| DF-Q039 | C    | sorts stably by several keys, also when sliced (top-k)                                         | [Query.sort](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L352)                   |
| DF-Q040 | C    | groups by keys of every type                                                                   | [Query.groupBy](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L610)                |
| DF-Q041 | C    | joins on a high-cardinality key                                                                | [Query.join](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L680)                   |
| DF-Q042 | C    | yields a long query so another fiber can interrupt it                                          | [Query yielding](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L65-L66)            |
| DF-Q043 | C    | compiles a schema's checks when the table is declared, and does not encode them to JSON        | [Query.table](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L254)                  |
| DF-Q044 | C    | tables declared by an Arrow schema convert their input to its columns                          | [Query.table](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L254)                  |
| DF-Q045 | C    | fails when a table is declared by a schema that has no columns for it                          | [Query.table](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L254)                  |
| DF-Q046 | C    | sums durations to durations in the column's unit                                               | [Expr.sum](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Expr.ts#L827)                      |
| DF-Q047 | C    | rejects aggregates that durations, timestamps, dates and times don't have                      | [Expr.mean](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Expr.ts#L838)                     |

DF-C022 to DF-C032 and DF-Q043 to DF-Q047 assert behaviour added after the baseline: checks compiled from the schema and refused by the JSON form of a plan, rejected transformations, tables declared by an Arrow schema, sums of durations, aggregates rejected for durations and points in time, `DataFrame.column`, which has no symbol at the baseline and links to the layouts it exposes, and the checks `DataFrame.fromRows` runs on the frame it built. Their links locate the symbol at the baseline; the documentation of that symbol in the checked-out source is their contract. DF-C024 observes which value constructors run (`DateTime`, `Duration`, `BigDecimal`) and covers only `DataFrame.fromRows` on rows that hold such values already, and a frame whose columns already have the declared types.

## Supported Schema subset

`DataFrame.fromRows`, `DataFrame.empty`, `DataFrame.validate` and `Query.table` read a struct schema once and take from it column types and checks. They never decode or encode with it.

| Schema                                    | Column type                                            |
| ----------------------------------------- | ------------------------------------------------------ |
| `String`, template literals               | Utf8                                                   |
| `Number`                                  | Float64, unless `options.types` names another type     |
| `Boolean`                                 | Bool                                                   |
| `BigInt`                                  | Int64                                                  |
| `Null`, `Undefined`                       | Null                                                   |
| literals and enums of one primitive type  | the type of their values                               |
| `DateTimeUtc`                             | Timestamp in microseconds, without a time zone         |
| `Duration`                                | Duration in microseconds                               |
| `BigDecimal`                              | Decimal; `options.types` must give precision and scale |
| `Array` of a supported schema             | List                                                   |
| `Struct` of supported schemas             | Struct                                                 |
| `NullOr`, `UndefinedOr`, optional fields  | the member's type, nullable                            |
| unions whose members have one column type | that type                                              |

Rejected with a `DataFrameError` that names the field: transformations (any schema with an encoding, such as `NumberFromString`, `decodeTo`, decoding defaults and renamed keys; `Schema.toType` gives the decoded side), `DateTimeZoned`, tuples, records, classes, unions of different column types, and recursive schemas.

Refinements, literals, enums and template literals are value checks: every value of such a field is read and tested, inside structs, arrays and union members too. A struct's own checks are row checks: every row is read and tested. A field with a value check accepts the stored values that `Schema.is` accepts for it (DF-C032): a check on a nullable field runs on its nulls too, a check on a union member runs on that member's values, and a union in `oneOf` mode takes a value of exactly one member. Fields without checks are checked by column type only, on the typed columns. `DataFrame.fromRows` builds its frame and then checks it as `DataFrame.validate` does, so all of them test what the frame stores: a `Float32` column's check sees the rounded number. `DataFrame.fromRows` rejects a `DateTime` or `Duration` finer than its column's unit instead of rounding it, and a decimal column holds no more digits than its precision, whichever of them checks it (DF-C029). The checks are compiled when the schema is read (`Plan.TableChecks`). They are functions and have no JSON form: `Plan.NodeFromJson` fails to encode a plan over a table that has them, naming the table, and fails to decode JSON that carries a `checks` key. `Plan.withoutChecks` removes them explicitly; the plan then encodes and checks column types only. A decoded plan gets its checks back by declaring the table again with `Query.table`. `Plan.Node` validates a plan as it is and keeps its checks. A SQL engine tests value checks on distinct values and fails for a table with row checks.

Checks are handed stored values as the schema writes them (DF-C031), in `DataFrame.fromRows`, `DataFrame.empty`, `DataFrame.validate` and `Query.table` alike. A frame holds `null` for every missing value, and a check sees an absent key for an optional field, `undefined` for `UndefinedOr` and `null` for `NullOr`. The rows `{}` and `{ a: undefined }` are one stored row, and a check sees an absent key for both.

A declaration is rejected with a `DataFrameError` that names the field when a check would see a missing value the schema writes in several ways, as the frame holds `null` for each of them:

- `null` next to `undefined` or an optional key (`optional(NullOr(String))`, `UndefinedOr(NullOr(String))`), under any check that is handed the value: a check of the field itself, or of a struct, array or union around it, row checks included.
- a union whose struct or array members write the same missing value in different ways, when its values are checked.

Such fields are accepted where no check is handed their value.

A table declared by an Arrow schema (DF-C025, DF-C026, DF-Q044) involves no Effect Schema and has no checks.

### Columnar path

Columns hold timestamps, dates, durations and decimals as integers under their Arrow type. `DateTime`, `Duration` and `BigDecimal` values are built only for rows and arrays of values (`DataFrame.toRows`, `DataFrame.toArray`). The tests are in `Query.test.ts`, under `Query > columnar path`, and in `packages/sql/pglite/test/DataFrameSql.test.ts`.

| ID      | Kind | File                   | Assertion / exact test title                                                        | API source                                                                                                                                                                                                                                                                                   |
| ------- | ---- | ---------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DF-N001 | P    | `Query.test.ts`        | decoding, querying and encoding build no DateTime, Duration or BigDecimal           | [DataFrame layouts](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L6-L9)                                                                                                                                      |
| DF-N002 | P    | `Query.test.ts`        | rows build one DateTime, Duration or BigDecimal per value; columns keep nanoseconds | [DataFrame.toRows](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/DataFrame.ts#L427)                                                                                                                                        |
| DF-N003 | C    | `Query.test.ts`        | dropping decimal digits rounds half to even, exactly                                | [Expr.castDecimal](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Expr.ts#L699), [Expr.round](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Expr.ts#L455) |
| DF-N004 | P    | `DataFrameSql.test.ts` | decimal results are read from their text, without BigDecimal values                 | [Sql contract](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Sql.ts#L1-L45)                                                                                                                                                |

DF-N001, DF-N002 and DF-N004 count calls of the functions `effect/arrow` and `effect/dataframe` build these values with: `makeUtc` and `makeZonedProto` of `effect/internal/dateTime`, `Duration.nanos`, and `BigDecimal.make`, `BigDecimal.round` and `BigDecimal.fromStringUnsafe`. DF-N002 shows the counters see the values of rows. A value built another way would not be counted, and the tests measure no memory.

DF-N001 covers one pipeline over timestamps in microseconds and nanoseconds (with and without a time zone), dates, durations, decimals and strings: IPC stream bytes decoded as a table and as a stream of batches, a filter against a timestamp literal, a sort, date and time fields, `truncate`, timestamp and duration arithmetic, a decimal cast to a lower scale, `round` on a decimal, and sums, means and extremes per group, run over a frame and over streamed batches, then exported and encoded. It makes no claim about other operations. Tables declared with a schema (`Query.table`) and `DataFrame.validate` are not part of it.

DF-N003 compares with `BigDecimal.round` in mode `half-even` over generated values, besides the listed ties. DF-N004 covers the plain notation PostgreSQL writes decimals in (`-12.34`), alone and in lists. A column with a value in another form, with more fraction digits than its scale or beyond 64 bits is still read through `BigDecimal`, which reports the invalid ones. DF-N004 also pins the message of a decimal result beyond 64 bits, a local detail.

## Oracle provenance and differential assertions

**DF-I-POLARS/<source>/<case-id>** (I) resolves exactly to `Query.test.ts > Query > Polars oracle > <source> > <case-id>: <description>`. Sources are `values`, `frames`, and `batches`; case IDs and descriptions are the existing entries in the pinned [spec.json](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/test/fixtures/dataframe/gold/spec.json) and [extended.json](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/test/fixtures/dataframe/gold/extended.json). This expansion rule identifies each assertion without duplicating the corpus or renaming tests. The three modes exercise inline frames, catalog frames and streamed batches against the same expected columns, types, values and row order.

The API authority is [Query semantics](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Query.ts#L46-L57) and [Expr semantics](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Expr.ts#L22-L48). Separately, expected results were generated with **Python Polars 2.1.0**, recorded in the corpus metadata and [generator invocation](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/test/fixtures/dataframe/generate_gold.py#L1-L32). No oracle was regenerated in this change.

Comparison policy is pinned in [Compare.ts](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/test/dataframe/oracle/Compare.ts#L1-L45): float relative tolerance `1e-9` plus `1e-300`, NaN equals NaN, and signed zeros compare equal. `group/small-ints` allows Int32 sums for i8/u8 instead of Polars Int64; values must still match. Temporal values compare via epoch integers. These are local comparison policies, not Arrow requirements.

## PostgreSQL / PGlite assertions

The actual SQL suite is **`packages/sql/pglite/test/DataFrameSql.test.ts`**, not `packages/sql/sql-pg/test`. Its public contract is [Sql.ts](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Sql.ts#L1-L45). Each title below is under `effect/dataframe on PostgreSQL (PGlite)`. This is PostgreSQL integration evidence, not SQL-standard conformance. The dependency and resolved version are reproducible from the pinned [package manifest](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/sql/pglite/package.json) and [pnpm lockfile](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/pnpm-lock.yaml).

**DF-I-SQL/<name>** (I) identifies the exact test named by each `cases` entry, executed by `it.effect(name, () => both(query))`. This includes generated temporal-cast and mixed-unit names: their literal templates and unit arrays in the [pinned suite](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/sql/pglite/test/DataFrameSql.test.ts#L169-L485) define the finite expansion. `both` compares in-memory results with PGlite, including types, length and ordered values (numeric tolerance `1e-9 * max(1, abs(actual))`). Shared compiler/API bugs can escape differential agreement; it is not an independent proof of the whole API.

| ID      | Kind  | Exact test title                                                           | API authority                                                                                                                                 |
| ------- | ----- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| DF-S001 | C / I | negative slices clamp both ends                                            | [Sql contract](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Sql.ts#L1-L45) |
| DF-S002 | C / I | rounds decimals half to even, keeping the scale                            | [Sql contract](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Sql.ts#L1-L45) |
| DF-S003 | C / I | errors carry the database's message                                        | [Sql contract](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Sql.ts#L1-L45) |
| DF-S004 | C / I | tables must satisfy their schema, as in memory                             | [Sql contract](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Sql.ts#L1-L45) |
| DF-S005 | C / I | tables reject values their declared types can't hold exactly, as in memory | [Sql contract](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Sql.ts#L1-L45) |
| DF-S006 | C / I | tables are checked on the rows the query reads, whatever the relation      | [Sql contract](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Sql.ts#L1-L45) |
| DF-S007 | C / I | tables are read from their names, whatever the compiler names              | [Sql contract](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Sql.ts#L1-L45) |
| DF-S008 | C / I | columns are one to PostgreSQL when their first 63 bytes are                | [Sql contract](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Sql.ts#L1-L45) |
| DF-S009 | C / I | timestamps with time zones are UTC, whatever the session's time zone       | [Sql contract](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Sql.ts#L1-L45) |
| DF-S010 | C / I | filters, derives and sorts                                                 | [Sql contract](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Sql.ts#L1-L45) |
| DF-S011 | C / I | groups in order of first appearance                                        | [Sql contract](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Sql.ts#L1-L45) |
| DF-S012 | C / I | joins keep the left row order                                              | [Sql contract](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Sql.ts#L1-L45) |
| DF-S013 | C / I | semi and anti joins, unique and slices                                     | [Sql contract](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Sql.ts#L1-L45) |
| DF-S014 | C / I | window functions over partitions                                           | [Sql contract](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Sql.ts#L1-L45) |
| DF-S015 | C / I | dates and times                                                            | [Sql contract](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Sql.ts#L1-L45) |
| DF-S016 | C / I | explain shows the SQL                                                      | [Sql contract](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Sql.ts#L1-L45) |
| DF-S017 | C / I | sums durations to durations, as in memory                                  | [Sql contract](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Sql.ts#L1-L45) |
| DF-S018 | C / I | rejects aggregates that durations and timestamps don't have, as in memory  | [Sql contract](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Sql.ts#L1-L45) |
| DF-S019 | C / I | unions and nullable fields are checked as in memory                        | [Sql contract](https://github.com/Effect-TS/effect/blob/d7121ccbd69f9f437ac60b09a704f216c0ca44ee/packages/effect/src/dataframe/Sql.ts#L1-L45) |

## Compiler assertions

`packages/effect/typetest/DataFrame.tst.ts` contains the following exact `describe` / `it` names. These are public API inference and rejection checks, not runtime or wire-format evidence. Each entry covers only its concrete expressions; it does not establish every overload or editor quick-info rendering.

### `DataFrame`

- `fromRows takes the row type from the schema`
- `fromRows, empty, validate and Query.table read missing values back as null`
- `validate and Query.table take Arrow types for the schema's fields`
- `validate and Query.table take an Arrow schema and give untyped rows`
- `column types its values by the frame's rows`
- `fromColumns infers column types`

### `Query`

- `from and table take the row type from the frame or schema`
- `is an Effect producing a frame of its rows`
- `filter keeps the row type`
- `select and withColumns compute the row type, nulls included`
- `pick, omit and rename`
- `groupBy and agg`
- `joins add the other side's columns; left joins make them nullable`
- `rejects mistakes`

### `Expr`

- `propagates nullability`
- `data-last forms`
- `durations sum to durations and have no mean`

### `Windows and reshaping`

- `over keeps the value type; window functions type their results`
- `pivot with declared columns is typed; without them rows are untyped`
- `unpivot names the variable and value columns`
- `explode and unnest`

### `Types`

- `dates, times and durations`
- `lists and structs`
- `decimals`

### `Streaming`

- `Query.stream emits frames of the row type`

Rejection assertions include unknown Arrow override fields (`DataFrame`), unknown columns/group keys, incompatible comparisons/arithmetic, non-aggregate aggregation, aggregate predicates and duplicate non-key join columns (`Query` / `rejects mistakes`), exploding a non-list column (`Windows and reshaping` / `explode and unnest`), extracting a year from a number (`Types` / `dates, times and durations`), and the mean, median, deviation and rolling mean of a duration and the sum of a timestamp (`Expr` / `durations sum to durations and have no mean`). Other entries assert exact inferred types, including nullability, Effect errors and stream elements.

## Exclusions and remaining gaps

- This inventory does not assert Arrow IPC or FlatBuffers wire conformance; DataFrame Arrow tests cover the adapter API and same-library round trips only. Wire formats belong to their own layer inventories.
- Polars corpus exclusions remain as recorded in `generate_gold.py:DEVIATIONS`: integral float literals, float-to-string formatting, automatic join suffixes, and mixed bigint/number arithmetic. No claim of universal Polars equivalence.
- SQL intentionally excludes pivot/unpivot/explode/unnest and databases other than PostgreSQL. Overflow, division by zero, collation and sub-microsecond temporal behavior follow the documented SQL deviations, not unconditional parity. PGlite is not a live PostgreSQL server/version matrix.
- The callback timing contract now has a direct test (DF-Q002); it supplements, rather than replaces, lazy loading and per-run catalog tests.
- DF-Q042 controls the host monotonic clock and disables automatic scheduler yields, then verifies a started public query lets its parent resume and interrupt it before completion. It does not assert a yield interval, timeout behavior, fairness among many fibers, or interruption within an operation.
- DF-C021 covers buffer reuse only for the compatible numeric layouts described above. Sliced/multi-batch inputs, validity buffers, other layouts and mutation/ownership guarantees remain outside that assertion.
- DF-C022 and DF-Q043 cover the check kinds named in their tests (a refinement, literals, an optional field, an array of structs, a row check). The subset table above is documentation: its rows are not each asserted here.
- Dedicated coverage for public guards, every dual overload, and every malformed plan/IPC input is not established by this inventory. Those are gaps, not passing assertions.
- Compiler inference/rejection coverage is inventoried above and is not counted as runtime coverage. Exact diagnostic strings and explain/format layouts are local regression details even where a test also verifies a public failure or result contract.

## Validation

Run from the repository root:

```sh
nix develop -c pnpm test --run packages/effect/test/dataframe/DataFrame.test.ts packages/effect/test/dataframe/Query.test.ts packages/sql/pglite/test/DataFrameSql.test.ts
nix develop -c pnpm test-types DataFrame
```

Keep existing regressions and oracle cases when updating the inventory. Do not turn an excluded case into a coverage claim without a focused assertion and an authoritative contract source.
