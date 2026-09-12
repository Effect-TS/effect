# @effect/sql-mssql

An Effect SQL client for Microsoft SQL Server with a native TDS 7.4 implementation.
Connections, pooling, transactions and cancellation are managed through Effect;
the runtime does not depend on `tedious`.

## Installation

```sh
npm install effect@rc @effect/sql-mssql@rc
```

## Documentation

- [Effect website](https://effect.website)
- [API reference](https://effect.website/docs/v4/api/sql-mssql)

## Native driver

The driver supports encrypted SQL authentication, NTLMv2, access-token FedAuth, named-instance discovery,
server-directed routing, parameterized queries, stored procedures with output
parameters, table-valued parameters, and nested transactions using savepoints.
Interrupted or timed-out requests send ATTENTION and drain its acknowledgement
before the connection can be reused. Failed connections are removed from the pool.

TLS is enabled by default and certificates are verified. `trustServer: true` is
intended for explicitly trusted self-signed servers, such as local test containers.
`encrypt: false` disables transport protection, including protection of credentials.
The request timeout defaults to 15 seconds; `requestTimeout: 0` disables it.

Use `MssqlTypes` from `@effect/sql-mssql` for procedure parameter descriptors and
`parameterTypes`. These are native descriptors, not the objects exported by tedious.
SQL `bigint` results remain strings; decimal and numeric results remain JavaScript
numbers, which can lose precision. Exact decimal input can be supplied as a string.
`time`, `datetime2`, and `datetimeoffset` results retain sub-millisecond precision
in a non-enumerable `nanosecondsDelta` property, compatible with tedious. Despite
the property's name, it is measured in seconds. Passing the Date back as a native
temporal parameter preserves the fraction at the requested scale. Lower scales
round values, including rollover at midnight.

For Azure SQL, provide `accessToken` as an Effect returning a redacted access
token for the SQL service. It runs for each new pooled connection, allowing the
application's credential provider to refresh expired tokens. Token acquisition
is bounded by `connectTimeout`, and requires TLS. The driver does not acquire
credentials from Azure CLI, managed identity, or environment variables itself.
`authType: "azure-active-directory-access-token"` is optional when `accessToken`
is provided. The token must target the Azure SQL service, not Azure management APIs.

Compatibility limits of this implementation:

- Security Token FedAuth has encrypted protocol tests, but has not been verified
  against live Azure SQL. Automatic Azure credential flows and ADAL/FEDAUTHINFO
  negotiation are not implemented; other Azure `authType` values fail explicitly.
- NTLMv2 has protocol/vector tests, but has not been verified against a live Windows
  domain. Extended Protection/channel binding is not implemented.
- Streaming queries remain unsupported. Results are buffered, with a 16 MiB per-token
  safety limit; a single larger row or value is rejected and closes the connection.
- Table-valued parameters use arrays of rows. Async row producers are not supported.
- UDT and SQL_VARIANT result values are decoded, but these types cannot be used
  as input or output parameter descriptors. UDT results are returned as binary data.

See [the benchmark guide](./benchmark/README.md) for live Docker tests and comparisons
with tedious. Tedious is retained only as a development benchmark dependency.
