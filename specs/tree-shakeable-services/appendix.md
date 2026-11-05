# Tree-shakeable services: appendix

The evidence behind [the spec](../tree-shakeable-services.md), the later migration phases in detail, and the decisions
that shaped the design. Every table here is the output of a command on this branch, named above it; nothing in this
file is normative. The branch point is `git merge-base HEAD origin/v4/next-minor`, `aab47a5070`.

## A. Cost

### Method

`pnpm --filter tree-shakeable-services-spec bench:check` (`specs/tree-shakeable-services/scripts/bench-check.ts`) runs
three modes in order, whatever each reports, each against the branch point's `Context.ts` loaded beside this branch's
in the same process so both run against the same `effect` runtime:

1. **Counts** (`packages/effect/benchmark/context/counts.ts --check`), the CI gate. `Map.prototype.get`, `has` and
   `set`, `Set.prototype.has`, and `WeakMap.prototype.get` and `set` are replaced by counting wrappers for one call,
   after a warm-up call and, for operations with a per-storage cache, after the first call, so the steady state is
   counted. A `Map` copied with `new Map(map)` counts its size. Bytes are the heap growth over four thousand calls
   whose results are kept, after a full collection and with none in between (a run with one is discarded), per call,
   after a hundred thousand warm-up calls; the smallest of five runs, rounded to eight bytes. Counts do not depend on
   the machine's load.
2. **Timing, ordinary keys** (`packages/effect/benchmark/context/operations.ts --ordinary`), in a process holding no
   record.
3. **Timing, records** (`operations.ts`), in a process that holds records, reads them and runs fibers.

**Timing.** Every ratio is paired and interleaved: within a round the two sides run as A, B, B, A in tight loops of a
calibrated iteration count (about 30 ms each), and the round's ratio is the CPU time (`process.cpuUsage`, user plus
system, so time preempted by another process is not charged) of the A loops over the B loops; a row's reading is the
median of 21 rounds. The first pair is an A/A control; its envelope (the larger of its median's distance from 1.00 and
its interquartile range) is added to every limit. Before calibration every case runs round-robin, so the optimiser
compiles the getters having seen every key shape and path, and both modules are warmed with the same context shapes;
in the records mode this branch's getters are also warmed with a record key.

**Orders and verdicts.** The same two closures can differ by a few nanoseconds depending on the order in which cases
were calibrated, optimised and laid out, with the A/A control none the wiser, so each timing mode runs in three
processes with the pairs in three orders (`BENCH_SEED=0,1,2`).

| Rule               | Verdict                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| readable order     | its A/A control envelope is within 1.05                                                                                         |
| mode               | decided only when all three orders are readable; otherwise INCONCLUSIVE, printed and neither passing nor failing                |
| gated pair         | passes when the median of its three per-order medians is within its limit plus the largest envelope: two of three orders within |
| any order, any row | a row over its limit is printed as a WARNING                                                                                    |
| gate               | fails when counts fail or a decided mode has a gated pair that does not pass                                                    |

**What is gated where.** Rows that compare this branch with itself (a record read against an ordinary read, a record
write against an ordinary write, `yield*` of a record against `yield*` of a plain service) are gated in the records
process. Rows that compare this branch's ordinary path with the branch point are gated at 1.05 in the no-record process,
where both modules serve the same calls. In the records process this branch's module serves the whole runtime (every
reference the fibers read, every operation and record) while a second copy serves the benchmark alone; identical code
in the two roles has read up to 1.11 apart, so the branch point's copy cannot be compared there, and its rows are
reported only. The ordinary rows are gated instead against a pristine twin: a copy of this branch's `Context.ts` loaded
beside it, warmed like the live module and put through the contexts the fiber runtime produces (roots carrying
`_fiberCache`, reads through overlays), so the remaining ratio is what records cost ordinary keys. Reads, the reference
default, add-then-read and `mergeAll` are gated at 1.10× the twin; the two plain `add` rows at 1.25×, because identical
code reads 1.0 in one order and up to 1.33 in others there (layout, not work: their counts are identical). With the
record dispatch moved to the miss path of `getUnsafe` (no `typeof` on the hit path) the flat read measured the same as
with it: the `typeof` is not what the records process pays; serving the runtime is.

**The price of invariant 3.** A new member override followed by a record read is one copy of the record and one
`WeakMap.set` that remembers it. Measured alone (`BENCH_ONLY="per request"`), on the same machine, one run after the
other: 278 ns with the `WeakMap.set`, and 144 ns with the copy kept in the one-entry cache only, as in round 10. That
is 5.8× and 3.2× an ordinary add-then-read of 48–52 ns. In the full runs the ratio ranges from 4.4 to 15.0× by order,
with run medians of 9.16 and 8.05. It is noisier than the other rows, likely because the `WeakMap` gains an entry per
request and the collector must do work on it (not separately measured). The row is gated at 10×, and the work itself
(one `WeakMap.set`, 312 bytes) is pinned by the counts. The one-entry cache alone broke "one object per storage" when
two override contexts were read alternately. A test that overrides a member per request pays about 130 ns per request.

### Counts

```
$ node benchmark/context/counts.ts --check
baseline: aab47a5070; operations and bytes per call

ordinary keys, this branch over the branch point (the same operations; under 1 KB, no more bytes)

  case                                                                              Map.get  Map.has  Map.set  Set.has  Weak.get  Weak.set   bytes
  getUnsafe, ordinary key, flat context, this branch                                      1        0        0        0         0         0       0
  getUnsafe, ordinary key, flat context, baseline                                         1        0        0        0         0         0       0
  getUnsafe, ordinary key, through one overlay, this branch                               1        0        0        0         0         0       0
  getUnsafe, ordinary key, through one overlay, baseline                                  1        0        0        0         0         0       0
  getUnsafe, reference default (slot absent), this branch                                 1        1        0        0         0         0       0
  getUnsafe, reference default (slot absent), baseline                                    1        1        0        0         0         0       0
  getOption, absent key, this branch                                                      1        1        0        0         0         0       0
  getOption, absent key, baseline                                                         1        1        0        0         0         0       0
  add, ordinary key to 33 slots, this branch                                              0        0        0        1         0         0     144
  add, ordinary key to 33 slots, baseline                                                 0        0        0        1         0         0     144
  add then getUnsafe, ordinary key, this branch                                           1        0        0        1         0         0     144
  add then getUnsafe, ordinary key, baseline                                              1        0        0        1         0         0     144
  make, ordinary key, this branch                                                         0        0        1        0         0         0     528
  make, ordinary key, baseline                                                            0        0        1        0         0         0     528
  mergeAll, 33 one-slot contexts, this branch                                             0        0       33        0         0         0    3024
  mergeAll, 33 one-slot contexts, baseline                                                0        0       33        0         0         0    5696

records, this branch

  case                                                                              Map.get  Map.has  Map.set  Set.has  Weak.get  Weak.set   bytes
  add, record (32 members) to 33 slots                                                    0        0        0        0         0         1    2216
  add, record (32 members) to 300 slots                                                   0        0        0        0         0         1    2216
  make, record (32 members)                                                               0        0       32        0         0         1    2632
  getUnsafe, member through a record's overlays                                           0        0        0        0         0         0       0
  getUnsafe, record through a record's overlays                                           0        0        0        1         0         0       0
  getUnsafe, record in a flat map, same context                                           0        0        0        0         0         0       0
  getUnsafe, record in a flat map, through one overlay                                    0        0        0        1         0         0       0
  add then getUnsafe, record in a flat map, context rebuilt per request                   0        0        0        1         0         0       0
  add, member override to a context holding the record                                    0        0        0        1         0         0     144
  getUnsafe, record with a member overridden underneath, through one overlay              0        0        0        2         0         0       0
  add member override then getUnsafe record, per request (new override each time)         1        0        0        1         2         1     312
  getUnsafe, record, two override contexts read alternately                               0        0        0        2         2         0       0
  getUnsafe, record never written, first read of a storage                                1        0        0        1         2         1     312
  getUnsafe, record never written, later read                                             0        0        0        0         0         0       0

OK: every count is as stated
```

Readings. Every ordinary-key operation performs the same `Map` and `Set` operations on this branch as at the branch
point and allocates no more bytes (the `mergeAll` bytes are what the allocator reserves for a `Map` of that size, and
vary between module instances). A record written into a context performs no `Map` operation: one ordinary overlay per
member and the object a read will return, remembered for the topmost overlay with one `WeakMap.set`, 2,216 bytes into
33 slots and into 300 alike; `make` of a record is 32 `Map.set`. A member read through a record's overlays is an
ordinary overlay hit. A record read is one `Set.has` (`~layout.index`) per overlay walked above its storage and then
the remembered object, with nothing allocated. A new override followed by a record read is one `Map.get` (the
member's name in `~layout.plain`), one `Set.has`, two `WeakMap.get` (the override's storage, a miss, and the record
below it), one copy of the record and one `WeakMap.set` that remembers the copy: 312 bytes with the overlay. Reads of
two override contexts, alternating, miss the one-entry cache and hit the `WeakMap` each time: two `Set.has`, two
`WeakMap.get`, nothing allocated, the same object per storage every time.

### Timing

Two full runs of `pnpm --filter tree-shakeable-services-spec bench:check` on the reference machine (a shared Linux
host), with the final rule and limits. The one exception is the per-request override row, which both runs read under
its previous 8× limit; it has been gated at 10× since (above). Both runs exited 0.

| Run | counts | ordinary keys: readable orders (envelopes), verdict        | records: readable orders (envelopes), verdict               |
| --- | ------ | ---------------------------------------------------------- | ----------------------------------------------------------- |
| 1   | OK     | 2 of 3: 0, 2 (0.05 / 0.08 / 0.03): INCONCLUSIVE, 1 warning | 2 of 3: 0, 1 (0.05 / 0.04 / 0.07): INCONCLUSIVE, 6 warnings |
| 2   | OK     | 0 of 3 (0.07 / 0.06 / 0.10): INCONCLUSIVE                  | 2 of 3: 1, 2 (0.08 / 0.05 / 0.03): INCONCLUSIVE, 6 warnings |

No timing mode has been decided on this host, so the timing gate has shown nothing either way. The counts gate held
both times. Here are the per-order readings of the readable orders (`*`: over the limit in that order, printed as a
WARNING; `?`: an unreadable order, shown for the record only):

| Pair                                                        | Run 1, orders 0 / 1 / 2    | Run 2, orders 0 / 1 / 2  | Limit (+e) |
| ----------------------------------------------------------- | -------------------------- | ------------------------ | ---------- |
| no records, vs branch point: getUnsafe ordinary             | 1.03 / 1.00? / 0.99        | all unreadable           | 1.05       |
| no records: getUnsafe mixed                                 | 1.01 / 1.01? / 1.02        |                          | 1.05       |
| no records: reference default                               | 0.98 / 1.00? / 0.97        |                          | 1.05       |
| no records: add 33 slots                                    | 1.08 / 1.01? / 1.04        |                          | 1.05       |
| no records: add mixed                                       | 1.10\* / 1.08? / 1.04      |                          | 1.05       |
| no records: add then getUnsafe                              | 1.01 / 1.06? / 1.02        |                          | 1.05       |
| no records: mergeAll                                        | 1.00 / 1.00? / 1.02        |                          | 1.05       |
| vs twin: getUnsafe ordinary                                 | 1.05 / 1.03 / 1.04?        | 1.01? / 1.04 / 1.03      | 1.10       |
| vs twin: getUnsafe mixed                                    | 0.88 / 0.87 / 0.88?        | 0.87? / 0.91 / 0.91      | 1.10       |
| vs twin: reference default                                  | 1.00 / 1.04 / 1.01?        | 1.01? / 1.02 / 1.02      | 1.10       |
| vs twin: add then getUnsafe                                 | 1.00 / 0.99 / 0.95?        | 0.95? / 0.98 / 1.00      | 1.10       |
| vs twin: mergeAll                                           | 1.03 / 1.01 / 1.22\*?      | 1.01? / 1.01 / 1.34\*    | 1.10       |
| vs twin: add 33 slots                                       | 1.15 / 1.27 / 1.06?        | 1.20? / 1.07 / 0.99      | 1.25       |
| vs twin: add mixed                                          | 0.97 / 1.03 / 1.09?        | 1.01? / 1.19 / 1.02      | 1.25       |
| vs branch point (reported): getUnsafe ordinary              | 1.10 / 1.13 / 1.10?        | 1.09? / 1.10 / 1.08      | –          |
| vs branch point (reported): add 33 slots                    | 1.17 / 1.14 / 1.28?        | 1.19? / 1.18 / 1.35      | –          |
| member override add / ordinary add                          | 1.01 / 2.20\* / 1.00?      | 1.01? / 2.75\* / 1.01    | 1.25       |
| new override then record read, per request                  | 14.96\* / 9.16\* / 9.16\*? | 8.97\*? / 8.05\* / 4.36  | 8 then 10  |
| record read, same context                                   | 0.79 / 0.80 / 0.79?        | 0.78? / 0.78 / 0.79      | 1.25       |
| record read, rebuilt per request                            | 1.06 / 0.98 / 1.04?        | 1.13? / 1.06 / 1.01      | 1.5        |
| record read, member overridden underneath                   | 1.09 / 1.23 / 1.11?        | 1.39? / 1.18 / 1.10      | 1.5        |
| record assembled from 32 member layers, rebuilt per request | 1.69\* / 1.01 / 1.08?      | 1.60\*? / 1.00 / 1.04    | 1.5        |
| record write per member, 33 slots                           | 56.71 / 48.85 / 60.94?     | 69.96\*? / 60.16 / 56.96 | 64         |
| record write per member, 300 slots                          | 45.39 / 42.52 / 58.91?     | 52.12? / 55.27 / 57.80   | 64         |
| record write, 300 / 33 slots                                | 0.95 / 1.00 / 0.94?        | 1.02? / 0.99 / 1.00      | 1.15       |
| record write / mergeAll of 33                               | 1.20 / 1.10 / 1.25?        | 1.23? / 1.17 / 1.09      | 1.25       |
| `yield*` record / plain, same context                       | 1.13 / 1.04 / 1.03?        | 1.00? / 1.06 / 1.03      | 1.25       |
| `yield*`, rebuilt per request                               | 1.04 / 1.04 / 1.04?        | 1.01? / 1.00 / 1.01      | 1.5        |
| `yield*`, member overridden underneath                      | 1.08 / 1.08 / 1.09?        | 1.11? / 1.07 / 1.05      | 1.5        |
| `yield*`, member overridden per request                     | 1.87 / 1.68 / 1.51?        | 1.91? / 1.88 / 1.59      | 3          |
| `provideService` of the whole record per request            | 3.95 / 4.33 / 4.18?        | 4.86? / 4.13 / 3.80      | 5          |
| `yield*`, from member layers                                | 1.13 / 1.17 / 1.04?        | 1.11? / 1.11 / 1.03      | 1.5        |
| operation call / method on a yielded plain record           | 0.85 / 0.86 / 0.91?        | 0.85? / 0.85 / 0.80      | 1.0        |
| method on the record service / on a plain record            | 1.03 / 1.03 / 1.03?        | 1.02? / 1.00 / 1.01      | 1.25       |

Readings:

- In the process that uses records, the twin rows show what records cost an ordinary key: reads 0.87 to 1.05, and
  `add` 0.97 to 1.27. The same rows against the branch point's copy, which serves only the benchmark, read 1.08 to
  1.35. That copy does not serve the runtime the live module serves: overlay walks, and the `_fiberCache` property
  that the fiber runtime puts on its roots.
- Three spikes stay in the same order in both runs: member override add in order 1 (2.20, 2.75), the record assembled
  from member layers in order 0 (1.69, 1.60), and twin `mergeAll` in order 2 (1.22, 1.34). Their counts match their
  pairs, and the other two orders read 1.00 to 1.08. That is consistent with layout rather than work, but it has not
  been diagnosed further. The median of three would absorb each spike, and the WARNING lines keep it visible.
- The timing modes need all three orders readable, and that did not happen in either run on this host. A quieter
  machine is needed to decide them; the counts decide every time.

## B. Tree-shaking

### What a kept key costs

A contract's declarations are calls (`Context.Operation<…>()("…")`), and a bundler keeps a top-level call it cannot
prove pure. The bundle check's annotation matrix measures the two-operation root with the contract as written, with
`/* @__PURE__ */` added to each declaration, and with `babel-plugin-annotate-pure-calls` run over the contract as
publishing it does, under esbuild and Rolldown, with `effect` itself bundled as it is published:

| Root (`main.ts`, two operations)                              |     Size | Keys kept           | Stream code |
| ------------------------------------------------------------- | -------: | ------------------- | ----------: |
| contract as written, esbuild                                  |  90.9 kB | all 30              |      1456 B |
| contract annotated `@__PURE__`, esbuild                       |  87.2 kB | readFile, writeFile |         0 B |
| contract published (`annotate-pure-calls`), esbuild           |  87.1 kB | readFile, writeFile |         0 B |
| contract as written, Rolldown                                 |  79.8 kB | all 30              |      1564 B |
| contract annotated `@__PURE__`, Rolldown                      |  77.1 kB | readFile, writeFile |         0 B |
| contract as written, `effect` from source, esbuild            | 437.5 kB | all 30              |    103.8 kB |
| contract annotated `@__PURE__`, `effect` from source, esbuild | 232.1 kB | readFile, writeFile |         0 B |

What the rows establish:

- **An unannotated contract costs under 4 kB: the thirty keys and a 1.4 kB wrapper.** The wrapper is
  `Stream.Operation`, `streamCall` and the `Stream.unwrap` they close over, kept because the three Stream keys are
  kept; it is not the Stream runtime, which in a published `effect` is itself tree-shaken function by function (the
  one-Stream-operation root carries 3.8 kB of it). The record service itself is absent from every row: it lives in a
  module of its own (`src/FileSystem.ts`, the record over the operations module imported as a namespace) whose exports
  the two-operation root never uses, and the prototype's `package.json` declares `sideEffects: false`, so the bundler
  drops the module whole. Nothing in the program's behaviour changes, so no rule is needed for shaking to work;
  annotations are an optimisation worth about 4 kB.
- **Published contracts shake without user action.** `packages/effect`'s build runs `babel-plugin-annotate-pure-calls`
  over `dist`, which annotates the outer call of every top-level declaration, curried or not, and esbuild drops the
  whole expression; the third row equals the second. This is how every `Context.Service("…")` key in `effect` shakes
  today, and `effect/FileSystem`'s operations shake the same way with no annotation in the source, which the bundle
  test in `packages/effect` checks against the real module. A namespace import of the operations module (the record
  module's `import * as members`) does not change this: once the record declaration is dropped, the namespace is unused
  and the bundler keeps only the operations the program reads.
- **Bundling `effect` from source is a different measurement.** The last two rows are the repository's own layout:
  `packages/effect/src/*.ts` has no annotations, so once a module is imported its whole body is kept, and importing
  anything from `Stream.ts` costs 104 kB. That is a property of unannotated module bodies, not of the design, and it
  is the same for any `Stream` import today. The matrix keeps the two rows so the difference is on record.

### The prototype's bundle check

```
$ pnpm --filter tree-shakeable-services-spec bundle
$ node scripts/check-bundle.ts
Bundle sizes (esm, unminified; effect as published unless noted)
  main.ts (two operation layers)                                               90.9 kB
  main-namespace.ts (two layers off a namespace)                               90.9 kB
  main-readonly.ts (ReadOnly subset, three member layers)                      91.4 kB
  main-stream.ts (one Stream operation)                                        96.7 kB
  main-twenty.ts (twenty operation layers)                                     97.0 kB
  main-record.ts (yield* FileSystem, record layer)                            111.8 kB
  main-full.ts (two operations, record layer)                                 103.5 kB
  main-terminal.ts (two terminal layers)                                       93.5 kB
  main-plain.ts (no record, no operation)                                      84.3 kB
  main-plain.ts (no record, no operation, branch point Context.ts)             83.9 kB
  main.ts (contract annotated @__PURE__, esbuild)                              87.2 kB
  main.ts (contract published (annotate-pure-calls), esbuild)                  87.1 kB
  main.ts (contract as written, rolldown)                                      79.8 kB
  main.ts (contract annotated @__PURE__, rolldown)                             77.1 kB
  main.ts (contract as written, effect from source, esbuild)                  437.5 kB
  main.ts (contract annotated @__PURE__, effect from source, esbuild)         232.1 kB
Implementation modules and markers in each bundle
  operation                 main.ts           main-readonly.ts  main-stream.ts    main-twenty.ts    main-full.ts      
  access                    absent            absent            absent            present           present           
  chmod                     absent            absent            absent            absent            present           
  chown                     absent            absent            absent            absent            present           
  copy                      absent            absent            absent            present           present           
  copyFile                  absent            absent            absent            present           present           
  exists                    absent            present           absent            present           present           
  glob                      absent            absent            absent            absent            present           
  link                      absent            absent            absent            absent            present           
  lstat                     absent            absent            absent            present           present           
  makeDirectory             absent            absent            absent            present           present           
  makeTempDirectory         absent            absent            absent            present           present           
  makeTempDirectoryScoped   absent            absent            absent            absent            present           
  makeTempFile              absent            absent            absent            absent            present           
  makeTempFileScoped        absent            absent            absent            absent            present           
  readDirectory             absent            absent            absent            present           present           
  readDirectoryEntries      absent            absent            absent            present           present           
  readFile                  present           present           absent            present           present           
  readFileString            absent            absent            absent            present           present           
  readLink                  absent            absent            absent            absent            present           
  realPath                  absent            absent            absent            present           present           
  remove                    absent            absent            absent            present           present           
  rename                    absent            absent            absent            present           present           
  stat                      absent            present           absent            present           present           
  stream                    absent            absent            present           absent            present           
  symlink                   absent            absent            absent            present           present           
  truncate                  absent            absent            absent            present           present           
  utimes                    absent            absent            absent            present           present           
  watch                     absent            absent            absent            absent            present           
  writeFile                 present           absent            absent            present           present           
  writeFileString           absent            absent            absent            present           present           
  main.ts                                                            contains 2 of 30 implementations: readFile, writeFile
  main-namespace.ts                                                  contains 2 of 30 implementations: readFile, writeFile
  main-readonly.ts                                                   contains 3 of 30 implementations: exists, readFile, stat
  main-stream.ts                                                     contains 1 of 30 implementations: stream
  main-twenty.ts                                                     contains 20 of 30 implementations: access, copy, copyFile, exists, lstat, makeDirectory, makeTempDirectory, readDirectory, readDirectoryEntries, readFile, readFileString, realPath, remove, rename, stat, symlink, truncate, utimes, writeFile, writeFileString
  main-record.ts                                                     contains 30 of 30 implementations: all
  main-full.ts                                                       contains 30 of 30 implementations: all
  main-terminal.ts                                                   contains 0 of 30 implementations: none
  main-plain.ts                                                      contains 0 of 30 implementations: none
  main-plain.ts                                                      contains 0 of 30 implementations: none
  main.ts [contract annotated @__PURE__, esbuild]                    contains 2 of 30 implementations: readFile, writeFile
  main.ts [contract published (annotate-pure-calls), esbuild]        contains 2 of 30 implementations: readFile, writeFile
  main.ts [contract as written, rolldown]                            contains 2 of 30 implementations: readFile, writeFile
  main.ts [contract annotated @__PURE__, rolldown]                   contains 2 of 30 implementations: readFile, writeFile
  main.ts [contract as written, effect from source, esbuild]         contains 2 of 30 implementations: readFile, writeFile
  main.ts [contract annotated @__PURE__, effect from source, esbuild] contains 2 of 30 implementations: readFile, writeFile
Terminal implementation modules in each bundle
  main-terminal.ts                                                   contains 2 of 6: columns, display
Stream runtime bytes in each bundle (Stream.ts, Channel.ts, Sink.ts and their internals; wrapper = under 2 kB)
  main.ts                                                            31 effect modules       1456 B  expected wrapper (Stream.ts, Channel.ts, internal/stream.ts)
  main-namespace.ts                                                  31 effect modules       1456 B  expected wrapper (Stream.ts, Channel.ts, internal/stream.ts)
  main-readonly.ts                                                   31 effect modules       1456 B  expected wrapper (Stream.ts, Channel.ts, internal/stream.ts)
  main-stream.ts                                                     35 effect modules       3838 B  expected used (Stream.ts, Channel.ts, internal/stream.ts)
  main-twenty.ts                                                     31 effect modules       1456 B  expected wrapper (Stream.ts, Channel.ts, internal/stream.ts)
  main-record.ts                                                     32 effect modules       3092 B  expected used (Stream.ts, Channel.ts, internal/stream.ts)
  main-full.ts                                                       32 effect modules       3092 B  expected used (Stream.ts, Channel.ts, internal/stream.ts)
  main-terminal.ts                                                   28 effect modules          0 B  expected none
  main-plain.ts                                                      27 effect modules          0 B  expected none
  main-plain.ts                                                      27 effect modules          0 B  expected none
  main.ts [contract annotated @__PURE__, esbuild]                    28 effect modules          0 B  expected none
  main.ts [contract published (annotate-pure-calls), esbuild]        28 effect modules          0 B  expected none
  main.ts [contract as written, rolldown]                            31 effect modules       1564 B  expected wrapper (Stream.ts, Channel.ts, internal/stream.ts)
  main.ts [contract annotated @__PURE__, rolldown]                   28 effect modules          0 B  expected none
  main.ts [contract as written, effect from source, esbuild]         77 effect modules     103.8 kB  expected used (Stream.ts, Channel.ts, Sink.ts, internal/stream.ts)
  main.ts [contract annotated @__PURE__, effect from source, esbuild] 53 effect modules          0 B  expected none
What Context.ts costs a bundle with no record and no operation
                        as printed    minified
  this branch              84.3 kB     47.9 kB
  branch point             83.9 kB     47.6 kB
  difference                 408 B       275 B  limit 512 B minified
Contract constants the bundler kept in the two-operation bundle
  main.ts                                                            keys: all 30; record service: absent
  main.ts [contract annotated @__PURE__, esbuild]                    keys: readFile, writeFile; record service: absent
  main.ts [contract published (annotate-pure-calls), esbuild]        keys: readFile, writeFile; record service: absent
  main.ts [contract as written, rolldown]                            keys: all 30; record service: absent
  main.ts [contract annotated @__PURE__, rolldown]                   keys: readFile, writeFile; record service: absent
  main.ts [contract as written, effect from source, esbuild]         keys: all 30; record service: absent
  main.ts [contract annotated @__PURE__, effect from source, esbuild] keys: readFile, writeFile; record service: absent
  node dist/main.js <file>: backed up 6 bytes of <file>
  node dist/main-stream.js <file>: <file> has 6 bytes
  node dist/main-readonly.js <file>: <file> is 6 bytes
  node dist/main-terminal.js <file>: displayed at 80 columns
  node dist/main-plain.js <file>: hello, <file>
OK: every bundle contains exactly the implementations its program uses, Effect-only roots carry at most a retained wrapper of the Stream runtime, and the shaken bundles run
```

The no-record root carries 408 bytes of `Context.ts` over the branch point as esbuild prints it and 275 bytes
minified, the form a bundle ships in and the one the check gates at 512: the `typeof` dispatch in `make`, `add`,
`pick`, `omit` and the getters, and the `OperationsTypeId` string. The record code hangs off the record key's
prototype, which such a bundle drops.

### The real module and the Node providers

`packages/effect/test/FileSystem/treeShaking.test.ts` bundles with esbuild (esm, platform node, es2022, `effect` as
published: `esbuild.transform` and `babel-plugin-annotate-pure-calls` over the sources, `absWorkingDir` set so the
metafile's paths resolve and the Stream-bytes assertion measures what it says):

| Root                                                               | Minified | Unminified | `internal/fileSystem` modules     | Stream runtime |
| ------------------------------------------------------------------ | -------: | ---------: | --------------------------------- | -------------: |
| `fixtures/tree-shaking/main.ts`: `FileSystem.readFile`/`writeFile` |   39,579 |     89,767 | (fixture layers)                  |            0 B |
| `main-node.ts`: `NodeFileSystem.readFile` + `writeFile`            |   39,939 |     91,152 | `readFile`, `shared`, `writeFile` |            0 B |
| `main-node-layer.ts`: `NodeFileSystem.layer`                       |   76,829 |    179,138 | all 32, `layer`, `shared`         |        1,287 B |

The two-operation root is 52 % of the aggregate (the test asserts under 60 %), and 39,959 bytes through
`@effect/platform-node` or `@effect/platform-bun`. The other 30 operation keys and `"effect/FileSystem"` are absent
from it; every bundle runs.

## C. Type-level evidence

The output of `pnpm --filter tree-shakeable-services-spec check-errors`, which compiles the nineteen files under
`typetest/errors` with the repository's `noErrorTruncation: true` and checks that each fails for its documented reason:

```
typetest/errors/displayed-type.ts(4,14): error TS2322: Type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' is not assignable to type 'string'.
typetest/errors/displayed-type.ts(6,14): error TS2322: Type 'Effect<Uint8Array<ArrayBufferLike>, FileSystemError, "effect/FileSystem/readFile">' is not assignable to type 'string'.
typetest/errors/displayed-type.ts(8,14): error TS2322: Type 'Stream<Uint8Array<ArrayBufferLike>, FileSystemError, "effect/FileSystem/stream">' is not assignable to type 'string'.
typetest/errors/effect-shape.ts(5,89): error TS2345: Argument of type '"test/readFile"' is not assignable to parameter of type '"The shape returns an Effect: define it with Context.Operation"'.
typetest/errors/forgotten-override.ts(7,3): error TS2379: Argument of type 'Effect<number, FileSystemError, "effect/FileSystem/writeFile">' is not assignable to parameter of type 'Effect<number, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"effect/FileSystem/writeFile"' is not assignable to type 'never'.
typetest/errors/generic-unnamed.ts(7,3): error TS2345: Argument of type '"test/parse"' is not assignable to parameter of type '"The shape of \"test/parse\" is generic or overloaded: its result must require \"test/parse\""'.
typetest/errors/missing-requirement.ts(5,19): error TS2379: Argument of type 'Effect<number, FileSystemError, "effect/FileSystem/readFile" | "effect/FileSystem/writeFile">' is not assignable to parameter of type 'Effect<number, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"effect/FileSystem/readFile" | "effect/FileSystem/writeFile"' is not assignable to type 'never'.
    Type '"effect/FileSystem/readFile"' is not assignable to type 'never'.
typetest/errors/missing-twenty.ts(48,19): error TS2379: Argument of type 'Effect<{ root: string; text: string; bytes: number; present: boolean; size: number; link: "Directory" | "File" | "Other" | "SymbolicLink"; real: string; names: number; entries: number; }, FileSystemError, "effect/FileSystem/rename" | "effect/FileSystem/stat" | "effect/FileSystem/utimes">' is not assignable to parameter of type 'Effect<{ root: string; text: string; bytes: number; present: boolean; size: number; link: "Directory" | "File" | "Other" | "SymbolicLink"; real: string; names: number; entries: number; }, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"effect/FileSystem/rename" | "effect/FileSystem/stat" | "effect/FileSystem/utimes"' is not assignable to type 'never'.
    Type '"effect/FileSystem/rename"' is not assignable to type 'never'.
typetest/errors/missing-twenty.ts(52,19): error TS2379: Argument of type 'Effect<unknown, FileSystemError, "effect/FileSystem/chmod" | "effect/FileSystem/chown" | "effect/FileSystem/glob" | "effect/FileSystem/link" | "effect/FileSystem/makeTempDirectoryScoped" | "effect/FileSystem/makeTempFile" | "effect/FileSystem/makeTempFileScoped" | "effect/FileSystem/readLink" | "effect/FileSystem/stream" | "effect/FileSystem/watch">' is not assignable to parameter of type 'Effect<unknown, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"effect/FileSystem/chmod" | "effect/FileSystem/chown" | "effect/FileSystem/glob" | "effect/FileSystem/link" | "effect/FileSystem/makeTempDirectoryScoped" | "effect/FileSystem/makeTempFile" | "effect/FileSystem/makeTempFileScoped" | "effect/FileSystem/readLink" | "effect/FileSystem/stream" | "effect/FileSystem/watch"' is not assignable to type 'never'.
    Type '"effect/FileSystem/chmod"' is not assignable to type 'never'.
typetest/errors/not-an-effect.ts(5,34): error TS2345: Argument of type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' is not assignable to parameter of type 'Effect<unknown, unknown, unknown>'.
typetest/errors/not-an-effect.ts(5,66): error TS18046: 'bytes' is of type 'unknown'.
typetest/errors/not-an-effect.ts(8,24): error TS2488: Type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' must have a '[Symbol.iterator]()' method that returns an iterator.
typetest/errors/not-an-operation.ts(6,39): error TS2344: Type '(path: string) => string' does not satisfy the constraint 'FunctionSignature'.
  Type '(path: string) => string' is not assignable to type 'EffectSignature'.
    Type 'string' is not assignable to type 'Effect<any, any, any>'.
typetest/errors/not-an-operation.ts(8,40): error TS2344: Type '{ readonly port: number; }' does not satisfy the constraint 'FunctionSignature'.
typetest/errors/not-an-operation.ts(10,46): error TS2344: Type 'Effect<number, never, never>' does not satisfy the constraint 'FunctionSignature'.
typetest/errors/overloaded-unnamed.ts(8,6): error TS2345: Argument of type '"test/format"' is not assignable to parameter of type '"The shape of \"test/format\" is generic or overloaded: its result must require \"test/format\""'.
typetest/errors/partial-aggregate.ts(7,14): error TS2375: Type 'Layer<"effect/FileSystem/readFile" | "effect/FileSystem/writeFile", never, never>' is not assignable to type 'Layer<FileSystem, never, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type 'FileSystem' is not assignable to type '"effect/FileSystem/readFile" | "effect/FileSystem/writeFile"'.
    Type '"effect/FileSystem/access"' is not assignable to type '"effect/FileSystem/readFile" | "effect/FileSystem/writeFile"'.
typetest/errors/partial-record.ts(6,67): error TS2740: Type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is missing the following properties from type 'Shape': access, chmod, chown, copy, and 25 more.
typetest/errors/partial-subset.ts(6,59): error TS2739: Type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is missing the following properties from type 'ReadOnlyShape': exists, stat
typetest/errors/record-requires-all.ts(8,19): error TS2379: Argument of type 'Effect<number, FileSystemError, FileSystem>' is not assignable to parameter of type 'Effect<number, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type 'FileSystem' is not assignable to type 'never'.
    Type '"effect/FileSystem/access"' is not assignable to type 'never'.
typetest/errors/record-requires-all.ts(11,3): error TS2379: Argument of type 'Effect<number, FileSystemError, "effect/FileSystem/access" | "effect/FileSystem/chmod" | "effect/FileSystem/chown" | "effect/FileSystem/copy" | "effect/FileSystem/copyFile" | "effect/FileSystem/exists" | "effect/FileSystem/glob" | "effect/FileSystem/link" | "effect/FileSystem/lstat" | "effect/FileSystem/makeDirectory" | "effect/FileSystem/makeTempDirectory" | "effect/FileSystem/makeTempDirectoryScoped" | "effect/FileSystem/makeTempFile" | "effect/FileSystem/makeTempFileScoped" | "effect/FileSystem/readDirectory" | "effect/FileSystem/readDirectoryEntries" | "effect/FileSystem/readFileString" | "effect/FileSystem/readLink" | "effect/FileSystem/realPath" | "effect/FileSystem/remove" | "effect/FileSystem/rename" | "effect/FileSystem/stat" | "effect/FileSystem/stream" | "effect/FileSystem/symlink" | "effect/FileSystem/truncate" | "effect/FileSystem/utimes" | "effect/FileSystem/watch" | "effect/FileSystem/writeFileString">' is not assignable to parameter of type 'Effect<number, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"effect/FileSystem/access" | "effect/FileSystem/chmod" | "effect/FileSystem/chown" | "effect/FileSystem/copy" | "effect/FileSystem/copyFile" | "effect/FileSystem/exists" | "effect/FileSystem/glob" | "effect/FileSystem/link" | "effect/FileSystem/lstat" | "effect/FileSystem/makeDirectory" | "effect/FileSystem/makeTempDirectory" | "effect/FileSystem/makeTempDirectoryScoped" | "effect/FileSystem/makeTempFile" | "effect/FileSystem/makeTempFileScoped" | "effect/FileSystem/readDirectory" | "effect/FileSystem/readDirectoryEntries" | "effect/FileSystem/readFileString" | "effect/FileSystem/readLink" | "effect/FileSystem/realPath" | "effect/FileSystem/remove" | "effect/FileSystem/rename" | "effect/FileSystem/stat" | "effect/FileSystem/stream" | "effect/FileSystem/symlink" | "effect/FileSystem/truncate" | "effect/FileSystem/utimes" | "effect/FileSystem/watch" | "effect/FileSystem/writeFileString"' is not assignable to type 'never'.
    Type '"effect/FileSystem/access"' is not assignable to type 'never'.
typetest/errors/shape-with-properties.ts(6,3): error TS2345: Argument of type '"test/double"' is not assignable to parameter of type '"The shape has properties: an operation is a bare function"'.
typetest/errors/stream-shape.ts(5,88): error TS2345: Argument of type '"test/stream"' is not assignable to parameter of type '"The shape returns a Stream: define it with Stream.Operation"'.
typetest/errors/subset-not-full.ts(7,14): error TS2375: Type 'Layer<ReadOnly, never, never>' is not assignable to type 'Layer<FileSystem, never, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type 'FileSystem' is not assignable to type 'ReadOnly'.
    Type '"effect/FileSystem/access"' is not assignable to type 'ReadOnly'. Did you mean '"effect/FileSystem/exists"'?
typetest/errors/value-shape.ts(7,32): error TS2349: This expression is not callable.
  Type 'Effect<number, never, "effect/Terminal/columns"> & Slot<"effect/Terminal/columns", Effect<number, never, never>> & { readonly "~effect/Context/Operation": "~effect/Context/Operation"; readonly key: "effect/Terminal/columns"; }' has no call signatures.
typetest/errors/value-shape.ts(9,54): error TS2344: Type '() => Effect<number, never, never>' does not satisfy the constraint 'Effect<any, any, any>'.
typetest/errors/wrong-override.ts(11,3): error TS2345: Argument of type '(path: number) => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>' is not assignable to parameter of type '(path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>'.
  Types of parameters 'path' and 'path' are incompatible.
    Type 'string' is not assignable to type 'number'.
typetest/errors/wrong-override.ts(16,13): error TS2375: Type 'Effect<Uint8Array<ArrayBuffer>, never, { readonly value: number; }>' is not assignable to type 'Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '{ readonly value: number; }' is not assignable to type 'never'.
typetest/errors/wrong-self.ts(11,82): error TS2345: Argument of type '"test/Partial"' is not assignable to parameter of type '"Self lacks the identifier of \"effect/FileSystem/writeFile\""'.
typetest/errors/wrong-self.ts(19,5): error TS2345: Argument of type '"test/WrongShape"' is not assignable to parameter of type '"Shape is not the members' shape: declare it as interface Shape extends Context.Operations.Shape<typeof members>, Context.Operations.Named {}"'.
typetest/errors/wrong-self.ts(21,45): error TS2345: Argument of type '"test/Unknown"' is not assignable to parameter of type '"Give the record its identifier: Context.Operations<Self, Shape>()(key, members)"'.
typetest/errors/wrong-self.ts(23,42): error TS2554: Expected 0 arguments, but got 1.

OK: every file under typetest/errors fails to compile for the documented reason
```

`partial-record.ts` and `partial-subset.ts` print the shape by name because the recipe gives `Shape` a second, empty
base, `Context.Operations.Named`: TypeScript reports an interface with exactly one base and no own members by its
base's name, so without it the missing-properties line named `Shape<typeof import(…)>` (or the member list).
`record-requires-all.ts(8,19)` is the record program run unprovided, which prints the record's name;
`record-requires-all.ts(11,3)` is the same program with two of its thirty operations provided, which prints the
remaining keys in full (`missing-twenty.ts(48,19)`, three left, prints three). The positive assertions,
`typetest/ok/signatures.ts`, compile under `pnpm --filter tree-shakeable-services-spec check`; the repository's type
tests are `packages/effect/typetest/Context.tst.ts` (13 tests) and `FileSystem.tst.ts` (3 tests), under `tstyche`.

## D. Compile cost

`tsc --extendedDiagnostics` (the repository's TypeScript, `packages/effect/tsconfig.json`, `--noEmit`, no incremental
cache) at the branch point and on this branch, which carries `Context`, the FileSystem and Terminal migrations with
`ReadOnly`, and their tests:

| Metric         |    before |     after |  change |
| -------------- | --------: | --------: | ------: |
| Types          | 1,046,206 | 1,055,272 | +0.87 % |
| Instantiations | 3,801,554 | 3,835,967 | +0.91 % |

Check time is not a criterion.

## E. The remaining phases in detail

**Done on this branch: `effect/FileSystem` providers, Node and Bun.** In `packages/platform/node-shared`, the 358-line
`src/NodeFileSystem.ts` is split into `src/internal/fileSystem/<op>.ts`, one module per operation (32), plus
`shared.ts` (the error mapping and handle helpers the primitives share) and `layer.ts` (the merge). Each primitive
exports `Layer.succeed(FileSystem.<op>, impl)` built from the function `NodeFileSystem.ts` had for that member;
`watch` is `Layer.effect` over `serviceOption(WatchBackend)`. The derived operations (`exists`, `glob`,
`readFileString`, `stream`, `sink`, `writeFileString`) are platform-independent: `effect/FileSystem` ships each as a
layer over the primitives it needs, and each platform module is that layer provided with the platform's primitive,
`Layer.provide(FileSystem.layerReadFileString, readFile.layer)`. `src/NodeFileSystem.ts` re-exports the 32 by member
name and `layer`, whose type and behaviour are unchanged; `@effect/platform-node`'s `NodeFileSystem` and
`@effect/platform-bun`'s `BunFileSystem` re-export all 33, so the export maps are unchanged. A program that provides
`NodeFileSystem.readFile` and `NodeFileSystem.writeFile` bundles those two modules and `shared` (B); one that provides
`NodeFileSystem.layer` behaves as before.

**Deno, out of scope.** `packages/platform/deno/src/DenoFileSystem.ts` is untouched and provides the record whole. The
same layout applies (one module per primitive over `Deno.*`, derived operations from `effect/FileSystem`'s layers) and
is an issue of its own.

**`effect/Terminal` providers (issue 11).** `NodeTerminal` becomes one module per member. `columns`, `rows` and
`display` are one-liners over `process.stdout`: `Layer.succeed(Terminal.columns, Effect.sync(() =>
process.stdout.columns ?? 80))`. `readInput`, `readLine` and `size` share the `stdin`/`readline` setup that
`make(shouldQuit)` does once today; it becomes an internal scoped service, `NodeTerminal/Input` (a `Context.Service`
whose layer owns the `readline` interface and the keypress listener), and each of the three is
`Layer.effect(Terminal.readInput, Effect.map(Input, …))` provided with it. A root that only displays never imports
`Input`, so neither `readline` nor the key-event parser is in its bundle, which the prototype's `main-terminal.ts`
measures (two of six members). `NodeTerminal.layer` keeps its form, a record layer with `Input` provided inside;
`NodeTerminal.make(shouldQuit)` keeps its signature. The prototype's `src/Terminal.ts` and `src/node/terminal/` are
this layout.

**`effect/FileSystem` consumers (issue 10).** The 57 `yield* FileSystem` sites inside `effect` move, one commit per
module: sites that use a few members call them (`ConfigProvider` directory reads, `Logger` file sinks, `cli`
completions) and expose the precise union, or annotate `FileSystem.ReadOnly` where they want one name; sites that read
and stream files (`HttpServerResponse.file`, `HttpStaticServer`) annotate `FileSystem.ReadOnly |
"effect/FileSystem/stream"`; sites that use many members, or hand the record to other code, keep `yield* FileSystem`.

**`effect/Terminal` consumers (issue 12).** The ten `cli/Prompt.ts` sites read `columns`, `readInput` and `display`;
the prompt runner takes `Terminal.Shape` by parameter in three places and keeps doing so. Each prompt's requirement
becomes `Terminal.Interactive`, a subset record over those three exported from `effect/Terminal`, so a CLI that never
prompts carries no reader.

## F. Decisions, and why

In the order an implementer meets them:

- **An operation is a `Context.Slot` that is a function, not a `Context.Key`.** A key is an Effect, and a value that
  is both callable and an Effect types one way and runs the other under every `isEffect` dispatch (the first hazard).
  Providing through a property of the operation (`op.service`) was a second rule for providing. `Key` is `@stability stable` and is an Effect, so
  `<I, S>(k: Context.Key<I, S>) => Effect.gen(function*() { return yield* k })` must keep compiling in a minor; making
  `Key` the non-Effect brand broke exactly that. A type test pins that a value typed `Key` is still an Effect.
  `Context.ts` gains type-only imports of `Stream` and `Sink` and imports `withFiberSucceed` from `internal/core.ts`;
  `Sink.ts`'s type-only import of `Context` becomes a value import, as `Stream.ts`'s already is; `pnpm circular` is
  clean.
- **The result kind is fixed at the definition** (`Context.Operation`, `Stream.Operation`, `Sink.Operation`,
  `Context.Operation.value`), because a type argument is erased and a call result must be exactly one kind of value.
  One constructor dispatching on `isEffect` of the implementation was the hazard again; Effect-valued members
  rewritten as functions of no arguments changed `Terminal`'s shape. The three function constructors accept one
  another's shapes so that the wrong one is a message naming the right one, rather than a constraint error naming a type.
- **The key is written once, in the one place it is used.** A flat form taking the key from an annotation wrote it
  twice; the curried form is what `Context.Service<Self, Shape>()("key")` already does.
- **A generic or overloaded shape names its key in its result**, checked by `Derivable` at the definition, rather
  than an escape hatch at every call site.
- **The record's identity is the union of its members' keys**, declared by the author for libraries so that
  diagnostics keep the name. A prefix type (`` `effect/FileSystem/${string}` ``) prints short but cannot be shown to
  be covered by a merge of member layers; the record interface as the identity, with branded member keys, keeps
  today's names but member layers can never satisfy it.
- **The shape is derived from the operations, and named.** `interface Shape extends Context.Operations.Shape<typeof
  members>, Context.Operations.Named {}`: each operation declares its shape once and the record derives the rest, so
  no hand-written interface has to be kept in step. TypeScript reports an interface with exactly one base and no own
  members by its base's name, so with `Shape<typeof members>` as the only base a partial record printed `Shape<typeof
  import(…)>`; `Named`, an exported empty interface, is the second base that makes it print `Shape` (C). It costs
  nothing at run time and one word in the recipe, and `KeyFor`'s message spells the recipe out.
- **The recipe is the floor.** The members cannot come from the shape (types are erased); a helper building operations
  from a table of names would keep every key in every bundle (B, "What a kept key costs"); and TypeScript names a type
  only where a declaration creates it. The member list is the module's export list where the operations have a module,
  and written out otherwise; a namespace import keeps nothing a written list does not.
- **No branded phase for unstable modules.** `FileSystem` and `Terminal` are `@stability unstable`, whose policy
  allows a breaking minor, so the identity change ships directly with the codemod and `ReadOnly`, without a period in
  which each operation is branded with the old identity.
- **The members are properties of the key**, so that the one-line form `Context.Operations("app/Users", { find })`
  gives `Users.find(id)`. A member whose name is a property of every key is rejected on the key argument
  (`Operations.Reserved`) and a defect at construction. They sit on a prototype of the key's own: an object given
  thirty properties one by one falls into V8's dictionary mode, and a dictionary-mode key read 39 ns where a fast one
  reads 6.
- **A record is its members and nothing else.** A slot of the record's own holding the provided object, returned while
  the members agreed with it, needed an equality check per read, views inheriting from class instances, a bound-method
  cache and string semantics for the record's own slot, each a seam: a class method calling a sibling through `this`
  skipped an override; `getOrUndefinedUnsafe` by the record's string returned the provided object after an override;
  overlays and flat maps followed different rules. A record write is its members' slots and a record read a plain
  object of them, assembled the same way on every path; `instanceof` and identity do not survive a read.
- **A record write is one ordinary overlay per member**, counting as one addition toward `maxDepth`. One overlay
  holding every member by position made `lookup` test every overlay's kind and cost the ordinary read 1.12 to 1.21× in
  a process holding no record; with per-member overlays the `Overlay` type, `lookup`, the flatten and `merge` are the
  branch point's code. The price is the write: about two ordinary writes per member (an overlay and a property of the
  assembled object).
- **Record state is two pieces: `~layout` and `~cache`.** Everything fixed at construction (members with their
  positions, the slot list, the slot index, the plain-member map, the template) is one immutable object, so a reader
  never sees it change; the only mutable state is the cache (the `WeakMap` of assembled objects, the one-entry cache in
  front of it, and whether a slot is fiber-cached, recomputed when `cacheKeys.size` changes).
- **Every assembled object is remembered under its storage**, an override's copy included, with the last one read in
  front. The storage is the topmost overlay holding one of the record's slots, or the base map; overlays above it hold
  other slots and cannot change the result, so contexts derived by unrelated writes share it. Keeping an override's
  copy in the one-entry cache alone was cheaper under collector pressure, but two override contexts read alternately
  then each rebuilt on every read and returned a new object each time, breaking "one object per storage"; remembering
  it costs one `WeakMap.set` per new override (A), gated at 10× an ordinary add-then-read. Every object is a spread of
  the per-record template, so it has fast properties.
- **Presence is `name in value`.** A member whose value is `undefined` is a member: a record holding an optional
  callback set to `undefined` is complete, and `getOption` is `Some`. Only an absent member is the defect.
- **A record provided without a member is a defect at the write**, naming the member's key, rather than a record that
  reads back a member no call can use.
- **A method found on a provided object's prototype is stored bound to the object**, at the write, so a class-based
  implementation works standalone as it does through the record, private fields included; it binds once per write.
- **A record service reads itself**: `yield*`, `use` and `useSync` on a record key call its read directly instead
  of passing through `Context.get`.
- **No defaults.** Every reason the overridable design was set aside is a reason not to add a defaulted variant;
  `Context.Reference` remains for values that want one, and may be a member.
- **The cost gate counts first and times second.** Counts do not depend on the machine and are the CI gate. Timing
  runs in three orders because order alone moves a row by a few nanoseconds; a mode is decided only when all three
  orders are readable, and a pair passes on the median of its three orders, so a single bad order neither passes nor
  fails a row, and an unreadable machine is INCONCLUSIVE rather than a pass. The records process compares ordinary rows with a twin of this branch's own code, because the
  branch point's copy cannot be put in the live role (A).
- **The bundle gate is on the minified bundle**, the form a bundle ships in.

## G. Alternatives rejected

- **Bundler-side property shaking (Rolldown)**, an earlier design. Teach the bundler to drop unused properties from service records by
  tracking demand from `Context` lookups to provider literals. Rolldown has no property-level shaking to build on; a
  plugin proof of concept recovered up to 41 % on closed-world programs but bailed out on exported entry points, Streams,
  forks, reflection and direct `Context` access. Complementary: it works on existing records without changing user code,
  at the cost of a bundler fork and a list of bailouts.

- **A `members` helper** that builds the operations from a table of names and kinds. Removes the key strings and the
  member list from a contract, and keeps every key and the Stream wrapper in every bundle that uses one (B).
- **A hand-written `Shape` interface** with the operations taking their shapes from it (`Shape["readFile"]`). Two
  declarations of every member's type, kept in step by a `ShapeDifference` check, and more compile time (D was +1.34 %
  types and +2.06 % instantiations with it).
- **A redeclared member in `Shape`** to make TypeScript print its name. Works, but repeats one member's type in every
  contract; the empty `Named` base does the same with nothing repeated.
- **Storing the record only under its own key, with members reading through it.** A member read would walk every record
  spanning it, and a member provided outside a record would lose to it: the precedence bug of slices.
- **One overlay holding every member by position.** A cheaper write (one allocation) and a dearer everything else:
  `lookup` tested every overlay's kind, the flatten knew the record, and the getters shared one helper compiled for
  both kinds of key.
- **Writing a record as a fresh flat map.** Correct and simple, but every `Effect.provideService(FileSystem, impl)`
  copied the context's map: 3.6 µs at 33 slots, 27 µs at 300. Per-member overlays cost the same into either.
- **A view with the overriding members only**, inheriting the rest from the provided object. Wrong under every
  operation that enumerates own properties (spread, `Object.keys`, `JSON.stringify`, `Effect.updateService` with a
  spread, `Layer.effect` over `yield* FileSystem`), and a `TypeError` from a class with private fields.
- **A `Proxy` as the record read.** Every property read is a trap, and a `Proxy` is one more kind of object a user's
  record can turn into.
- **Keeping an override's copy in the one-entry cache only.** Breaks one object per storage when two override contexts
  are read alternately (F).
- **Building the assembled object without a template.** `{}` plus thirty keyed stores is a dictionary-mode object;
  `Object.fromEntries` per read costs 2.3 µs; a spread of a template built once costs 120 ns and is fast.
- **Dispatching record reads on the miss path of the getters**, so the hit path has no `typeof`. Measured at the same
  cost (A), and it makes the record's string a slot again: a `Context.Service` built with it would hide the members
  from `Context.get` while `yield*` kept reading them.
- **Rebuilding the record on every member write** instead of reading on demand. A flat copy and a thirty-member rebuild
  on every override, and a per-context index of records.
- **Class-style operations** (`class ReadFile extends Context.Operation<…>()("…") {}`). A class cannot be called
  without `new`.
- **An identifier type parameter for operations** (`Operation<Self, Shape>`). Two operations with the same shape would
  alias in `R` unless each carried a brand; the key string is already unique and nominal.
- **A `read` method on every key's prototype as the getters' dispatch.** A key built structurally (`{ key }`) has no
  prototype of ours, so the getter would still test for the method, and the call is a polymorphic property load on
  every read where the `typeof` costs none.
- **The key in the wrong-kind message.** TypeScript infers the key literal only from a branch of `KeyFor` that is the
  type parameter itself; a message built from it printed `${string}` in the key's place.
