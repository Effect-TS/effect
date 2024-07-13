# Effect SQL - Kysely

A Kysely integration for @effect/sql.

## Disclaimer

This integration is not fully `Future Proof` as it's dependant on some `Kysely` internals.
Meaning that if `Kysely` changes some of its internals (new Builders, Builders renaming, Builders removing, Builders splitting, etc), this integration might break.
So use it at your own risk or pin your `Kysely` version to be sure to not have any breaking changes.

## Compatibility matrix

| Kysely version  | Effect SQL - Kysely support |
| --------------- | --------------------------- |
| 0.26.1 - 0.27.3 | ✅                          |
