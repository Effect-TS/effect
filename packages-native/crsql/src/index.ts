/**
 * CR-SQLite service for conflict-free replicated database operations.
 *
 * This module provides a high-level Effect service interface for working with CR-SQLite
 * (Conflict-free Replicated SQLite) databases. CR-SQLite enables multi-master replication
 * with automatic conflict resolution, allowing seamless data synchronization across
 * distributed systems without manual conflict handling.
 *
 * **Core Capabilities:**
 * - **Site Management**: Getting unique site identifiers and database versions
 * - **Change Synchronization**: Pulling and applying change sets between replicas
 * - **Peer Tracking**: Managing replication cursors for distributed peers
 * - **Schema Migration**: Automated schema evolution with crsql_automigrate
 * - **Fractional Indexing**: Ordered list support for collaborative editing
 *
 * **Multi-Master Replication**: All operations support CR-SQLite's CRDT (Conflict-free
 * Replicated Data Type) semantics, enabling partition-tolerant systems where multiple
 * replicas can accept writes independently and later converge to a consistent state.
 *
 * All operations are Effect-based for composable error handling, dependency injection,
 * and integration with the broader Effect ecosystem.
 *
 * **Security Note**: This module uses Effect SQL's tagged template literals,
 * which automatically handle parameterization and SQL injection protection.
 * The `${variable}` syntax is safe - Effect SQL converts these to proper
 * parameterized queries under the hood.
 *
 * @since 0.1.0
 */
export * as CrSql from "./CrSql.js"

/**
 * Error types for CR-SQLite operations.
 *
 * This module defines tagged errors used throughout the CR-SQLite package
 * for handling various failure scenarios in a type-safe manner.
 *
 * @since 0.1.0
 * @example
 * ```typescript
 * import * as CrSqlErrors from "@effect-native/crsql/CrSqlErrors"
 * import { Effect } from "effect"
 *
 * // Handle specific error types
 * const program = Effect.fail(new CrSqlErrors.CrSqliteExtensionMissing()).pipe(
 *   Effect.catchTag("CrSqliteExtensionMissing", (error) =>
 *     Effect.succeed("handled error")
 *   )
 * )
 * ```
 */
export * as CrSqlErrors from "./CrSqlErrors.js"

/**
 * Schema definitions for CR-SQLite change tracking and serialization.
 *
 * This module provides Effect Schema definitions for CR-SQLite data structures,
 * including change rows, tracked peers, and various identifier types used
 * throughout the CR-SQLite system.
 *
 * @since 0.1.0
 * @example
 * ```typescript
 * import * as CrSqlSchema from "@effect-native/crsql/CrSqlSchema"
 * import { Schema as S } from "effect"
 *
 * // Validate a change row from CR-SQLite
 * const changeRow = {
 *   table: "users",
 *   pk: "1A2B3C4D",
 *   cid: "name",
 *   val: "Alice",
 *   val_type: "text",
 *   col_version: "1",
 *   db_version: "1",
 *   site_id: "A1B2C3D4E5F6789012345678ABCDEF90",
 *   cl: 0,
 *   seq: 0
 * }
 *
 * const decoded = S.decodeUnknownSync(CrSqlSchema.ChangeRowSerialized)(changeRow)
 * ```
 */
export * as CrSqlSchema from "./CrSqlSchema.js"

/**
 * CR-SQLite extension loading and information utilities.
 *
 * This module provides low-level utilities for loading the CR-SQLite extension
 * and retrieving information about it. It handles the dynamic import of the
 * native library, loads the extension into the SQLite connection, and provides
 * structured information about the loaded extension.
 *
 * The main operations include:
 * - Loading the CR-SQLite extension from the native library
 * - Querying extension information (SHA, site ID)
 * - Creating Effect services for dependency injection
 *
 * @since 0.1.0
 */
export * as CrSqliteExtension from "./CrSqliteExtension.js"

/**
 * CR-SQLite compatible Sqlite client tag and type.
 *
 * This augments the base `@effect/sql` `SqlClient` with the SQLite-specific
 * ability to `loadExtension`, which CR-SQLite requires to activate its
 * functionality on a connection.
 *
 * Implementations are provided by platform drivers such as
 * `@effect/sql-sqlite-node` and `@effect/sql-sqlite-bun`, which already expose
 * a `loadExtension` method. This tag allows CR-SQLite helpers to depend on the
 * minimal capability needed across platforms.
 *
 * @since 0.1.0
 */
export * as SqliteClient from "./SqliteClient.js"
