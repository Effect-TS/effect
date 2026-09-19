---
"@effect/sql-mysql": patch
---

Add `@effect/sql-mysql`, a MySQL client that speaks the protocol directly instead of wrapping a driver. It has no runtime dependencies — `node:net` and `node:tls` are the only transport — and requires MySQL 8.0 or newer.

Authentication covers `caching_sha2_password` (the MySQL 8 default, including the RSA key exchange that full authentication needs on a plaintext socket), `sha256_password`, `mysql_native_password`, and `mysql_clear_password` for accounts backed by PAM, LDAP or Kerberos. The last of those sends the password unprotected, so it is refused unless the connection is encrypted.

It sits alongside `@effect/sql-mysql2`, which is unchanged. The two share the `SqlClient` contract, so switching is a change of layer:

```ts
import { MysqlClient } from "@effect/sql-mysql"

const layer = MysqlClient.layer({ url: Redacted.make("mysql://user:pass@localhost:3306/app") })
```

Behaviour that differs from `@effect/sql-mysql2` and is worth checking before you switch:

- `BIGINT` decodes to `bigint` rather than a number, and `DECIMAL` to a string, so neither is silently rounded. `bigintAsNumber: true` restores the lossy convenience. Note that a bare integer literal is a `BIGINT` in MySQL, so `` sql`SELECT 1` `` yields `1n`.
- `DATETIME` and `TIMESTAMP` decode to epoch milliseconds, and `TIME` to signed microseconds, since `TIME` is a duration spanning -838:59:59 to 838:59:59 rather than a clock reading. `dateStrings: true` returns strings instead.
- The session time zone is set to UTC on connect, which is what makes temporal decoding deterministic rather than dependent on the server's zone. Override it with `timezone`.
- `BLOB` and `TEXT` are told apart by the column's collation, so binary columns yield `Uint8Array` and text columns yield `string`.
- Errors are classified from the server's ERR packet rather than from a driver exception: the error number is consulted first and the SQLSTATE class second, so errors the table does not name still land in the right family.
- `LOAD DATA LOCAL INFILE` is refused: the capability is not negotiated, so a server requesting one is treated as a protocol violation.

Also included: `MysqlMigrator`, whose `mysqldump` schema dump is implemented rather than pending a `Command` module, and which passes the password through `MYSQL_PWD` rather than argv.
