@effect-native/crsql
=====================

CR-SQLite prepared statements and service for Effect SQL.

- Exposes a service layer that requires an `@effect/sql` `SqlClient`.
- Provides prepared statements for CR-SQLite operations (work in progress).

This package follows the Effect monorepo conventions for build, testing, and documentation.

---

### crsql extension Core Public API

*   **`crsql_as_crr(table_name)`**: Converts an existing table into a CRR, setting up the necessary structures for tracking changes.
*   **`crsql_as_table(table_name)`**: Downgrades a CRR back to a standard table, removing the change tracking mechanisms.
*   **`crsql_begin_alter(table_name)`**: Prepares a CRR table for schema modification by temporarily removing its triggers.
*   **`crsql_commit_alter(table_name)`**: Finalizes schema modifications on a CRR table by recreating triggers and updating internal bookkeeping.
*   **`crsql_automigrate(schema)`**: Applies schema migrations to the database, automatically creating or altering tables as defined in the provided schema.
*   **`crsql_site_id()`**: Returns the unique identifier for the current database instance, essential for distinguishing between changes from different replicas.
*   **`crsql_db_version()`**: Retrieves the current version of the database, which increments after each transaction.
*   **`crsql_next_db_version()`**: Returns the database version that will be assigned to the next transaction.
*   **`crsql_rows_impacted()`**: Returns the number of rows affected by the last database write.
*   **`crsql_sha()`**: Returns the Git commit SHA of the `crsqlite` build, useful for versioning and debugging.

### Configuration

*   **`crsql_config_set(key, value)`**: Sets a configuration parameter for the `crsqlite` extension.
*   **`crsql_config_get(key)`**: Retrieves the current value of a configuration parameter.

### Fractional Indexing (for Ordered Lists)

*   **`crsql_fract_as_ordered(table_name, order_column, ...)`**: Enables fractional indexing on a table to maintain a stable order for rows, even with concurrent insertions.
*   **`crsql_fract_key_between(key1, key2)`**: Generates a new fractional index key between two existing keys, allowing for ordered insertions without re-indexing.

### Virtual Tables

*   **`crsql_changes`**: A virtual table that provides a log of all changes made to CRR tables. This is the primary mechanism for syncing changes between databases.
