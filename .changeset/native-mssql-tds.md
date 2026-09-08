---
"@effect/sql-mssql": minor
---

Replace the tedious runtime dependency with an Effect-native TDS 7.4 driver,
including TLS, SQL, NTLMv2 and access-token FedAuth authentication, parameter and result codecs,
stored procedures, table-valued parameters, transaction-aware calls and safe
cancellation. Export native MssqlTypes descriptors and add requestTimeout.

Automatic Azure credential flows are not yet supported; applications can provide
an Effect-based access-token provider. Native parameter descriptors
replace tedious descriptors; see the package README for compatibility limits.
