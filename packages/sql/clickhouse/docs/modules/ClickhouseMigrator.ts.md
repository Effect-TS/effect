---
title: ClickhouseMigrator.ts
nav_order: 2
parent: Modules
---

## ClickhouseMigrator.ts overview

ClickHouse adapter for the shared Effect SQL migration runner.

This module re-exports the common `Migrator` loaders and error types, then
provides `run` and `layer` helpers that apply ordered migrations through the
current ClickHouse `SqlClient`. `run` returns the applied migration IDs and
names, while `layer` runs the migrations during layer construction and
provides no services.

Since v4.0.0

---

## Exports Grouped by Category

- [layers](#layers)
  - [layer](#layer)
- [running](#running)
  - [run](#run)
- [utils](#utils)
  - ["effect/sql/Migrator" (namespace export)](#effectsqlmigrator-namespace-export)

---

# layers

## layer

Creates a layer that runs the configured ClickHouse migrations during layer
construction and provides no services.

**Signature**

```ts
declare const layer: <R>(
  options: Migrator.MigratorOptions<R>
) => Layer.Layer<never, Migrator.MigrationError | SqlError, Client.SqlClient | R>
```

[Source](https://effect.website/blob/main/src/ClickhouseMigrator.ts#L48)

Since v4.0.0

# running

## run

Runs SQL migrations for ClickHouse using the supplied migrator options and
returns the applied migration IDs and names.

**Signature**

```ts
declare const run: <R2 = never>({
  loader,
  schemaDirectory,
  table
}: Migrator.MigratorOptions<R2>) => Effect.Effect<
  ReadonlyArray<readonly [id: number, name: string]>,
  Migrator.MigrationError | SqlError,
  Client.SqlClient | R2
>
```

[Source](https://effect.website/blob/main/src/ClickhouseMigrator.ts#L32)

Since v4.0.0

# utils

## "effect/sql/Migrator" (namespace export)

Re-exports all named exports from the "effect/sql/Migrator" module.

**Signature**

```ts
export * from "effect/sql/Migrator"
```

[Source](https://effect.website/blob/main/src/ClickhouseMigrator.ts#L22)

Since v4.0.0
