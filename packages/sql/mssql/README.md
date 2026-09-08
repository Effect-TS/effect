# @effect/sql-mssql

An Effect SQL client for Microsoft SQL Server with a native TDS 7.4 implementation.
Connections, pooling, transactions and cancellation are managed through Effect;
the runtime does not depend on `tedious`.

## Installation

```sh
npm install effect @effect/sql-mssql
```

## Links

- [Website](https://effect.website): documentation, guides, and news.
- [Reference](https://effect.website/docs/v4/api/sql-mssql): API documentation for this package.
- [Discord](https://discord.gg/effect-ts): ask questions, share what you're building, and talk to the core team.
- [Community](https://effect.website/community-hub): meetups and events, or bring Effect to your own.
- [Issues](https://github.com/Effect-TS/effect/issues): bug reports and feature requests.

## Let's talk

Whether your team is considering Effect, rolling it out, or already running it in production, we'd love to hear from you: what you're building, what works, and what you need from Effect next.

- **Talk to the maintainers.** Introduce your team on [Discord](https://discord.gg/effect-ts) or email [contact@effectful.co](mailto:contact@effectful.co). We're happy to connect privately on Slack or Discord for feedback and help with adoption.
- **Production support.** We're exploring how to better support teams running Effect in production. If your organization has specific support needs, let's discuss them.
- **Adoption help.** Our [adoption partners](https://effect.website/adoption-partners) offer implementation, consulting, team extension, training, and commercial support.

## Native driver

The driver supports encrypted SQL authentication, NTLMv2, named-instance discovery,
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

Compatibility limits of this implementation:

- Azure/Entra authentication is not implemented; unsupported `authType` values fail explicitly.
- NTLMv2 has protocol/vector tests, but has not been verified against a live Windows
  domain. Extended Protection/channel binding is not implemented.
- Streaming queries remain unsupported. Results are buffered, with a 16 MiB per-token
  safety limit; a single larger row or value is rejected and closes the connection.
- Table-valued parameters use arrays of rows. Async row producers are not supported.
- UDT and SQL_VARIANT result values are decoded, but these types cannot be used
  as input or output parameter descriptors. UDT results are returned as binary data.

See [the benchmark guide](./benchmark/README.md) for live Docker tests and comparisons
with tedious. Tedious is retained only as a development benchmark dependency.
