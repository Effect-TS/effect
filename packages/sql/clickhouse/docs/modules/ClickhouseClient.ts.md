---
title: ClickhouseClient.ts
nav_order: 1
parent: Modules
---

## ClickhouseClient.ts overview

ClickHouse driver for Effect SQL, backed by `@clickhouse/client`.

This module provides both the ClickHouse-specific `ClickhouseClient`
service and the generic `Client.SqlClient` service. `make` creates a
scoped client, checks the connection with `ping()`, maps ClickHouse errors
to `SqlError`, and aborts in-flight queries when interrupted. The
ClickHouse-specific service adds typed parameters, command execution, insert
queries, format-aware streaming with progress events, query id and settings
helpers, a statement compiler, and direct or config-backed layers.

Since v4.0.0

---

## Exports Grouped by Category

- [constructors](#constructors)
  - [make](#make)
  - [makeCompiler](#makecompiler)
- [layers](#layers)
  - [layer](#layer)
  - [layerConfig](#layerconfig)
- [models](#models)
  - [ClickhouseClientConfig (interface)](#clickhouseclientconfig-interface)
  - [ClickhouseCustom (type alias)](#clickhousecustom-type-alias)
- [services](#services)
  - [ClickhouseClient](#clickhouseclient)
  - [ClickhouseClient (interface)](#clickhouseclient-interface)
  - [ClickhouseSettings](#clickhousesettings)
  - [ClientMethod](#clientmethod)
  - [QueryId](#queryid)
- [type IDs](#type-ids)
  - [TypeId](#typeid)
  - [TypeId (type alias)](#typeid-type-alias)
- [utility types](#utility-types)
  - [QueryStreamRow (type alias)](#querystreamrow-type-alias)

---

# constructors

## make

Creates a scoped `ClickhouseClient`, verifies connectivity with `ping()`,
closes the underlying client when the scope ends, maps ClickHouse failures
to `SqlError`, and aborts plus kills in-flight queries when interrupted.

**Signature**

```ts
declare const make: (
  options: ClickhouseClientConfig
) => Effect.Effect<ClickhouseClient, SqlError, Scope.Scope | Reactivity.Reactivity>
```

[Source](https://effect.website/blob/main/src/ClickhouseClient.ts#L266)

Since v4.0.0

## makeCompiler

Creates the SQL statement compiler for ClickHouse, emitting typed
`{pN: Type}` placeholders and escaping identifiers with an optional query
name transform.

**Signature**

```ts
declare const makeCompiler: (transform?: (_: string) => string) => Statement.Compiler
```

[Source](https://effect.website/blob/main/src/ClickhouseClient.ts#L794)

Since v4.0.0

# layers

## layer

Provides both `ClickhouseClient` and generic `SqlClient` services from a
ClickHouse client configuration.

**Signature**

```ts
declare const layer: (
  config: ClickhouseClientConfig
) => Layer.Layer<ClickhouseClient | Client.SqlClient, Config.ConfigError | SqlError>
```

[Source](https://effect.website/blob/main/src/ClickhouseClient.ts#L750)

Since v4.0.0

## layerConfig

Provides both `ClickhouseClient` and generic `SqlClient` services from a
`Config`-backed ClickHouse client configuration.

**Signature**

```ts
declare const layerConfig: (
  config: Config.Wrap<ClickhouseClientConfig>
) => Layer.Layer<ClickhouseClient | Client.SqlClient, Config.ConfigError | SqlError>
```

[Source](https://effect.website/blob/main/src/ClickhouseClient.ts#L726)

Since v4.0.0

# models

## ClickhouseClientConfig (interface)

Configuration for creating a ClickHouse client, combining
`@clickhouse/client` options with optional span attributes and query/result
name transforms.

**Signature**

```ts
export interface ClickhouseClientConfig extends Clickhouse.ClickHouseClientConfigOptions {
  readonly spanAttributes?: Record<string, unknown> | undefined
  readonly transformResultNames?: ((str: string) => string) | undefined
  readonly transformQueryNames?: ((str: string) => string) | undefined
}
```

[Source](https://effect.website/blob/main/src/ClickhouseClient.ts#L218)

Since v4.0.0

## ClickhouseCustom (type alias)

Custom SQL fragment type used for ClickHouse typed parameters created by
`ClickhouseClient.param`.

**Signature**

```ts
type ClickhouseCustom = ClickhouseParam
```

[Source](https://effect.website/blob/main/src/ClickhouseClient.ts#L825)

Since v4.0.0

# services

## ClickhouseClient

Service tag for the active ClickHouse SQL client.

**When to use**

Use to access or provide a ClickHouse SQL client through the Effect context.

**Signature**

```ts
declare const ClickhouseClient: Context.Service<ClickhouseClient, ClickhouseClient>
```

[Source](https://effect.website/blob/main/src/ClickhouseClient.ts#L207)

Since v4.0.0

## ClickhouseClient (interface)

ClickHouse-specific `SqlClient` extension with access to its configuration,
typed parameter fragments, command-mode execution, insert queries,
format-aware query streaming, and per-effect query ID and ClickHouse
settings.

**Signature**

```ts
export interface ClickhouseClient extends Client.SqlClient {
  readonly [TypeId]: TypeId
  readonly config: ClickhouseClientConfig
  readonly param: (dataType: string, value: unknown) => Statement.Fragment
  readonly asCommand: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  readonly insertQuery: <T = unknown>(options: {
    readonly table: string
    readonly values: Clickhouse.InsertValues<Readable, T>
    readonly format?: Clickhouse.DataFormat
    readonly columns?: NonNullable<Clickhouse.InsertParams<Readable, T>["columns"]>
  }) => Effect.Effect<Clickhouse.InsertResult, SqlError>
  readonly queryStream: <A, Format extends Clickhouse.StreamableDataFormat = "JSONEachRow">(
    statement: Statement.Statement<A>,
    options?: {
      readonly format?: Format | undefined
    }
  ) => Stream.Stream<QueryStreamRow<A, Format>, SqlError>
  readonly withQueryId: {
    (queryId: string): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
    <A, E, R>(effect: Effect.Effect<A, E, R>, queryId: string): Effect.Effect<A, E, R>
  }
  readonly withClickhouseSettings: {
    (
      settings: NonNullable<Clickhouse.BaseQueryParams["clickhouse_settings"]>
    ): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
    <A, E, R>(
      effect: Effect.Effect<A, E, R>,
      settings: NonNullable<Clickhouse.BaseQueryParams["clickhouse_settings"]>
    ): Effect.Effect<A, E, R>
  }
}
```

[Source](https://effect.website/blob/main/src/ClickhouseClient.ts#L164)

Since v4.0.0

## ClickhouseSettings

Context reference containing ClickHouse settings to attach to queries,
commands, and inserts.

**Signature**

```ts
declare const ClickhouseSettings: Context.Reference<
  Partial<ClickHouseServerSettings> &
    Partial<ClickHouseHTTPSettings> &
    Record<string, string | number | boolean | SettingsMap | undefined>
>
```

[Source](https://effect.website/blob/main/src/ClickhouseClient.ts#L712)

Since v4.0.0

## ClientMethod

Context reference read by the low-level ClickHouse connection to choose query
or command execution for statements; defaults to `query`.

**Signature**

```ts
declare const ClientMethod: Context.Reference<"query" | "command" | "insert">
```

[Source](https://effect.website/blob/main/src/ClickhouseClient.ts#L684)

Since v4.0.0

## QueryId

Context reference for the ClickHouse `query_id` applied to queries and
inserts; a random UUID is generated when no query ID is set.

**Signature**

```ts
declare const QueryId: Context.Reference<string | undefined>
```

[Source](https://effect.website/blob/main/src/ClickhouseClient.ts#L699)

Since v4.0.0

# type IDs

## TypeId

Unique runtime identifier used to tag `ClickhouseClient` values.

**Signature**

```ts
declare const TypeId: "~@effect/sql-clickhouse/ClickhouseClient"
```

[Source](https://effect.website/blob/main/src/ClickhouseClient.ts#L143)

Since v4.0.0

## TypeId (type alias)

Type-level literal for the `ClickhouseClient` runtime identifier.

**Signature**

```ts
type TypeId = "~@effect/sql-clickhouse/ClickhouseClient"
```

[Source](https://effect.website/blob/main/src/ClickhouseClient.ts#L152)

Since v4.0.0

# utility types

## QueryStreamRow (type alias)

Element type emitted by `ClickhouseClient.queryStream` for a given streamable
format: decoded rows for streamable JSON formats, rows interleaved with
progress events for `JSONEachRowWithProgress`, and raw `Uint8Array` chunks
for raw formats such as `CSV`, `TabSeparated` (TSV), or `Parquet`.

**Details**

`transformResultNames` is applied to decoded rows, including the `row`,
`totals`, `min`, and `max` payloads of `JSONEachRowWithProgress` events; raw
chunks are emitted untouched.

`{exception: string}` events reported by the server in
`JSONEachRowWithProgress` streams are never emitted; they fail the stream
with a classified `SqlError` instead. These streams enable the
`http_write_exception_in_output_format` setting unless it is set in the
client config or per request, so failures after streaming has started are
reliably classified.

**Gotchas**

In other formats a failure after streaming has started still fails the
stream, but it may surface as an `UnknownError` instead of a classified
reason.

**Signature**

```ts
type QueryStreamRow<
  T,
  Format extends Clickhouse.StreamableDataFormat = "JSONEachRow"
> = Format extends "JSONEachRowWithProgress"
  ? Exclude<Clickhouse.RowOrProgress<T>, { exception: string }>
  : Format extends Clickhouse.StreamableJSONDataFormat
    ? T
    : Uint8Array
```

[Source](https://effect.website/blob/main/src/ClickhouseClient.ts#L252)

Since v4.0.0
