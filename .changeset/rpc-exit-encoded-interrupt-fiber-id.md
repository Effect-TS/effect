---
"effect": patch
---

Type the interrupt `fiberId` in `RpcMessage.ExitEncoded` as `number | null`. JSON based RPC serializations encode an interrupt without a fiber id as `null` and reject `undefined` when decoding, so encoded exits built by hand should use `null`.
