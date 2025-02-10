---
title: Introduction
permalink: /
nav_order: 1
has_children: false
has_toc: false
---

# Effect Monorepo

> An ecosystem of tools to build robust applications in TypeScript

## Introduction

Welcome to Effect, a powerful TypeScript framework that provides a fully-fledged functional effect system with a rich standard library.

Effect consists of several packages that work together to help build robust TypeScript applications. The core package, `effect`, serves as the foundation of the framework, offering primitives for managing side effects, ensuring type safety, and supporting concurrency.

## Monorepo Structure

The Effect monorepo is organized into multiple packages, each extending the core functionality. Below is an overview of the packages included:

| Package                           | Description                                                                                 |                                                                                                    |
| --------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `effect`                          | Core package                                                                                | [README](https://github.com/Effect-TS/effect/blob/main/packages/effect/README.md)                  |
| `@effect/ai`                      | AI utilities                                                                                | [README](https://github.com/Effect-TS/effect/blob/main/packages/ai/ai/README.md)                   |
| `@effect/ai-openai`               | OpenAI utilities                                                                            | [README](https://github.com/Effect-TS/effect/blob/main/packages/ai/openai/README.md)               |
| `@effect/cli`                     | CLI utilities                                                                               | [README](https://github.com/Effect-TS/effect/blob/main/packages/cli/README.md)                     |
| `@effect/cluster`                 | Distributed computing tools                                                                 | [README](https://github.com/Effect-TS/effect/blob/main/packages/cluster/README.md)                 |
| `@effect/cluster-browser`         | Cluster utilities for the browser                                                           | [README](https://github.com/Effect-TS/effect/blob/main/packages/cluster-browser/README.md)         |
| `@effect/cluster-node`            | Cluster utilities for [Node.js](https://nodejs.org)                                         | [README](https://github.com/Effect-TS/effect/blob/main/packages/cluster-node/README.md)            |
| `@effect/cluster-workflow`        | Workflow management for clusters                                                            | [README](https://github.com/Effect-TS/effect/blob/main/packages/cluster-worflow/README.md)         |
| `@effect/experimental`            | Experimental features and APIs                                                              | [README](https://github.com/Effect-TS/effect/blob/main/packages/experimental/README.md)            |
| `@effect/opentelemetry`           | [OpenTelemetry](https://opentelemetry.io/) integration                                      | [README](https://github.com/Effect-TS/effect/blob/main/packages/opentelemetry/README.md)           |
| `@effect/platform`                | Cross-platform runtime utilities                                                            | [README](https://github.com/Effect-TS/effect/blob/main/packages/platform/README.md)                |
| `@effect/platform-browser`        | Platform utilities for the browser                                                          | [README](https://github.com/Effect-TS/effect/blob/main/packages/platform-browser/README.md)        |
| `@effect/platform-bun`            | Platform utilities for [Bun](https://bun.sh/)                                               | [README](https://github.com/Effect-TS/effect/blob/main/packages/platform-bun/README.md)            |
| `@effect/platform-node`           | Platform utilities for [Node.js](https://nodejs.org)                                        | [README](https://github.com/Effect-TS/effect/blob/main/packages/platform-node/README.md)           |
| `@effect/platform-node-shared`    | Shared utilities for [Node.js](https://nodejs.org)                                          | [README](https://github.com/Effect-TS/effect/blob/main/packages/platform-node-shared/README.md)    |
| `@effect/printer`                 | General-purpose printing utilities                                                          | [README](https://github.com/Effect-TS/effect/blob/main/packages/printer/README.md)                 |
| `@effect/printer-ansi`            | ANSI-compatible printing utilities                                                          | [README](https://github.com/Effect-TS/effect/blob/main/packages/printer-ansi/README.md)            |
| `@effect/rpc`                     | Remote procedure call (RPC) utilities                                                       | [README](https://github.com/Effect-TS/effect/blob/main/packages/rpc/README.md)                     |
| `@effect/rpc-http`                | HTTP-based RPC utilities                                                                    | [README](https://github.com/Effect-TS/effect/blob/main/packages/rpc-http/README.md)                |
| `@effect/sql`                     | SQL database utilities                                                                      | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql/README.md)                     |
| `@effect/sql-clickhouse`          | An `@effect/sql` implementation for [ClickHouse](https://clickhouse.com/).                  | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-clickhouse/README.md)          |
| `@effect/sql-d1`                  | An `@effect/sql` implementation for [Cloudflare D1](https://developers.cloudflare.com/d1/). | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-d1/README.md)                  |
| `@effect/sql-drizzle`             | An `@effect/sql` implementation for [Drizzle](https://orm.drizzle.team/).                   | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-drizzle/README.md)             |
| `@effect/sql-kysely`              | An `@effect/sql` implementation for [Kysely](https://kysely.dev/).                          | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-kysely/README.md)              |
| `@effect/sql-libsql`              | An `@effect/sql` implementation using the `@libsql/client` library.                         | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-libsql/README.md)              |
| `@effect/sql-mssql`               | An `@effect/sql` implementation using the mssql `tedious` library.                          | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-mssql/README.md)               |
| `@effect/sql-mysql2`              | An `@effect/sql` implementation using the `mysql2` library.                                 | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-mysql2/README.md)              |
| `@effect/sql-pg`                  | An `@effect/sql` implementation using the `postgres.js` library.                            | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-pg/README.md)                  |
| `@effect/sql-sqlite-bun`          | An `@effect/sql` implementation using the `bun:sqlite` library.                             | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-sqlite-bun/README.md)          |
| `@effect/sql-sqlite-do`           | An `@effect/sql` implementation for Cloudflare Durable Objects sqlite storage.              | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-sqlite-do/README.md)           |
| `@effect/sql-sqlite-node`         | An `@effect/sql` implementation using the `better-sqlite3` library.                         | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-sqlite-node/README.md)         |
| `@effect/sql-sqlite-react-native` | An `@effect/sql` implementation using the `react-native-quick-sqlite` library.              | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-sqlite-react-native/README.md) |
| `@effect/sql-sqlite-wasm`         | An `@effect/sql` implementation using the `@sqlite.org/sqlite-wasm` library.                | [README](https://github.com/Effect-TS/effect/blob/main/packages/sql-sqlite-wasm/README.md)         |
| `@effect/typeclass`               | Functional programming type classes                                                         | [README](https://github.com/Effect-TS/effect/blob/main/packages/typeclass/README.md)               |
| `@effect/vitest`                  | Testing utilities for [Vitest](https://vitest.dev/)                                         | [README](https://github.com/Effect-TS/effect/blob/main/packages/vitest/README.md)                  |

# Documentation

## Website

For detailed information and usage examples, visit the [Effect website](https://www.effect.website/).

## API Reference

For a complete API reference of the core package `effect`, see the [Effect API documentation](https://effect-ts.github.io/effect/).

## Introduction to Effect

Get started with Effect by watching our introductory video on YouTube. This video provides an overview of Effect and its key features:

[![Introduction to Effect](https://img.youtube.com/vi/ViSiXfBKElQ/maxresdefault.jpg)](https://youtu.be/ViSiXfBKElQ)

# Connect with Our Community

Join the Effect community on Discord to connect with other developers, ask questions, and share insights: [Join Effect's Discord Community](https://discord.gg/hdt7t7jpvn).
