---
"effect": patch
---

- Allow `Config.withDefault` and `Config.option` to recover `Config.all` groups with missing children even when other children have values. Validation and source errors still propagate. A group default replaces the entire group; put defaults on individual children to preserve supplied values, or use `Config.schema(Schema.Struct(...))` to reject incomplete objects.
- Make `Config.orElse` adopt the fallback's result, allowing a later default or option to handle an absent fallback even after invalid input was recovered.
- Return `None` for `ShardingConfig.runnerListenAddress` when `listenHost` is absent and `listenPort` is valid. Supply `listenHost` to configure the listen address.
