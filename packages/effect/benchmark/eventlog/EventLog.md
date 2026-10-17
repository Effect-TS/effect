# EventLog benchmark

Run the benchmark from the repository root:

```sh
nix develop -c pnpm --dir packages/effect exec node benchmark/eventlog/EventLog.ts
```

Set `EVENTLOG_BENCH_CACHED_ID=1` to memoize `Entry.idString` per instance before the run. The source is not changed; the benchmark patches the getter to estimate the gain from caching the id string.

Sections:

1. `Entry.idString` cost per call, with and without a `Map` lookup, against precomputed strings.
2. `EventLogRemote.makeUnencrypted` writing to the unencrypted server over `RpcTest`, with memory storage and a no-op handler. The session handshake runs outside the timed region. "older than history" places the incoming entries before every stored entry, so conflict detection scans the whole history for each incoming entry. "newer than history" is the control.
3. Client side:
   - 3a. Change-frame decoding, `EventLogEncryption.decrypt`, and raw AES-GCM for the same entries.
   - 3b. `EventLog` remote replay with a memory journal and a no-op handler. A fake remote hands the whole backlog to `runRemote` as one batch. "with conflicts" stores 1000 newer entries on 100 keys first.

Every macro sample builds fresh state outside the timed region, drops one warmup sample, and reports the median. Compare cases within one run; absolute numbers vary with the machine and runtime.
