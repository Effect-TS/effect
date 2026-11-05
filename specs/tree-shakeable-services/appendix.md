# Tree-shakeable services: appendix

The evidence behind [the spec](../tree-shakeable-services.md), and the record of the decisions that shaped it. Every
table here is the output of a command on this branch, named above it; nothing in this file is normative.

## A. Cost

### Method

Three measurements, run in order by `pnpm --filter tree-shakeable-services-spec bench:check`
(`specs/tree-shakeable-services/scripts/bench-check.ts`), each against the `Context.ts` of the branch point
(`git merge-base HEAD origin/v4/next-minor`), loaded beside this branch's in the same process so both run against the
same `effect` runtime:

1. **Counts** (`packages/effect/benchmark/context/counts.ts --check`). `Map.prototype.get`, `has` and `set`, and
   `WeakMap.prototype.get` and `set`, are replaced by counting wrappers for the duration of one call, after a warm-up
   call and, for operations with a per-storage cache, after the first call so that the steady state is counted. A `Map`
   copied with `new Map(map)` calls the replaced `set` once per entry, so a copy of a context's map counts as its size.
   Bytes are the growth of the heap over four thousand calls whose results are kept, after a full collection and with
   none in between (a run in which one happens is discarded), per call, after a hundred thousand warm-up calls so the
   code is optimized (before that, the interpreter allocates about a hundred bytes of bookkeeping per call); the
   smallest of five runs, rounded to eight bytes. Counts do not depend on the machine's load. This is the gate a
   continuous integration runner applies.
2. **Timing, ordinary keys** (`operations.ts --ordinary --check`), in a process that holds no record.
3. **Timing, records** (`operations.ts --check`), in a process that holds records and reads them.

The timing method: every ratio is paired and interleaved; within a round, the two sides of a pair run as A, B, B, A in
tight loops of a calibrated iteration count (about 30 ms each), and the round's ratio is the CPU time
(`process.cpuUsage`, user plus system, so that time preempted by another process is not charged) of the two A loops
over the two B loops. The number reported is the median of the per-round ratios over 21 rounds, with the 25th and 75th
percentiles beside it. The first pair is an A/A control, the same loop on both sides; its envelope (the larger of its
median's distance from 1.00 and its interquartile range) is added to every limit. A run whose control is outside 1.05
is repeated once with ten more rounds; if the control is still outside, the run reports SKIPPED and exits 0: the
machine cannot be read, nothing has been shown either way, and the runner continues with the next mode. Both modules
are warmed to the same six key shapes before measuring (V8 compiles a property load for up to four receiver shapes),
and every per-request pair keeps the derived context where the optimiser can see it escape. Absolute costs are
reported and not gated.

The runner's summary lists each mode as OK, SKIPPED or EXCEEDED; the gate fails only on EXCEEDED. The run pasted first
below is a run of the whole gate on a shared machine whose load average was between 15 and 20 on eight cores: the
counts and the ordinary timing passed and the records timing was skipped after two attempts. The records run pasted
after it is from the same machine at a load average of 48, passing on its second attempt (31 rounds) with a control
envelope of 0.05; three other records-mode runs in this round, at load averages of 10 to 37, were skipped by their
control with envelopes of 0.06 to 0.10 and ratios within 0.05 of the run pasted.

### Counts

```
$ node benchmark/context/counts.ts --check
baseline: 5cd5d29096; operations and bytes per call

ordinary keys, this branch over the branch point (each pair must be identical)

  case                                                                              Map.get  Map.has  Map.set  Weak.get  Weak.set   bytes
  getUnsafe, ordinary key, flat context, this branch                                      1        0        0         0         0       0
  getUnsafe, ordinary key, flat context, baseline                                         1        0        0         0         0       0
  getUnsafe, ordinary key, through one overlay, this branch                               1        0        0         0         0       0
  getUnsafe, ordinary key, through one overlay, baseline                                  1        0        0         0         0       0
  getUnsafe, reference default (slot absent), this branch                                 1        1        0         0         0       0
  getUnsafe, reference default (slot absent), baseline                                    1        1        0         0         0       0
  getOption, absent key, this branch                                                      1        1        0         0         0       0
  getOption, absent key, baseline                                                         1        1        0         0         0       0
  add, ordinary key to 33 slots, this branch                                              0        0        0         0         0     152
  add, ordinary key to 33 slots, baseline                                                 0        0        0         0         0     144
  add then getUnsafe, ordinary key, this branch                                           1        0        0         0         0     152
  add then getUnsafe, ordinary key, baseline                                              1        0        0         0         0     144
  make, ordinary key, this branch                                                         0        0        1         0         0     528
  make, ordinary key, baseline                                                            0        0        1         0         0     528
  mergeAll, 33 one-slot contexts, this branch                                             0        0       33         0         0    3008
  mergeAll, 33 one-slot contexts, baseline                                                0        0       33         0         0    5696

records, this branch

  case                                                                              Map.get  Map.has  Map.set  Weak.get  Weak.set   bytes
  add, record (32 members) to 33 slots                                                    0        0        0         0         0     840
  add, record (32 members) to 300 slots                                                   0        0        0         0         0     840
  make, record (32 members)                                                               0        0       33         0         0    4536
  getUnsafe, member through a record overlay                                              1        0        0         0         0       0
  getUnsafe, record through a record overlay                                              0        0        0         0         0       0
  getUnsafe, record in a flat map, same context                                           0        0        0         0         0       0
  getUnsafe, record in a flat map, through one overlay                                    0        1        0         0         0       0
  add then getUnsafe, record in a flat map, context rebuilt per request                   0        1        0         0         0       0
  add, member override to a context holding the record                                    0        0        0         0         0     152
  getUnsafe, record with a member overridden underneath, through one overlay              0        2        0         0         0       0
  add member override then getUnsafe record, per request (new override each time)         1        1        0         2         1     112
  getUnsafe, record never written, first read of a storage                                0        1        0         0         0       0
  getUnsafe, record never written, later read                                             0        0        0         0         0       0

OK: every count is as stated
```

Readings. Every ordinary-key operation performs the same `Map` operations on this branch as at the branch point; the
one difference in bytes is `add`, whose overlay carries one more field (`record`, always `undefined` for an ordinary
key): 152 against 144 bytes. A record written into a context performs no `Map` operation: one overlay (152 bytes) with
an array of the 32 members and one small object, 840 bytes in all, into 33 slots and into 300 alike. `make` of a record
is 33 `Map.set`, one per slot of the fresh flat map. A member read through a record overlay is one `Map.get` (the
member's position). A record read from a record overlay performs no lookup at all; from a flat map it is one `Map.has`
per overlay walked (the check that the overlay does not hold one of the record's slots) and then the remembered object,
with nothing allocated; with a member overridden underneath, one `Map.has` for the per-request overlay and one for the
override, then one `Map.get` (the member's name) and the view, one object with one own property, built on each read.
A new override followed by a record read is the same: one `Map.has`, one `Map.get`, one small object, no member read
and nothing remembered. The large allocations (`mergeAll` of 33 contexts, `make` of a record) read with some variance
between runs and are reported, not gated.

### Timing, ordinary keys

```
$ node benchmark/context/operations.ts --ordinary --check
baseline: 5cd5d29096; 21 rounds, each loop about 30 ms of CPU time, A/B/B/A within a round; ns/op; ordinary keys only (no record is held or read in this process)

  case                                                                            median       min       max
  control A: getUnsafe, ordinary key, this branch                                   23.5      21.8      32.3
  control B: getUnsafe, ordinary key, this branch                                   23.7      21.9      46.4
  getUnsafe, ordinary key, this branch                                              23.7      21.7      71.4
  getUnsafe, ordinary key, baseline                                                 21.8      21.0      44.1
  getUnsafe, mixed key kinds, this branch                                           38.0      35.1      69.9
  getUnsafe, mixed key kinds, baseline                                              35.5      30.2      46.7
  getUnsafe, reference default, this branch                                         23.1      19.5     110.2
  getUnsafe, reference default, baseline                                            22.6      19.8      60.9
  add, ordinary key, this branch                                                    49.8      37.1     166.4
  add, ordinary key, baseline                                                       47.5      42.2     128.9
  add, mixed key kinds, this branch                                                 65.0      54.9      75.0
  add, mixed key kinds, baseline                                                    59.9      51.3      84.1
  add then getUnsafe, ordinary key, this branch                                     75.4      58.8     141.2
  add then getUnsafe, ordinary key, baseline                                        71.5      57.7     128.8
  mergeAll, 33 contexts, this branch                                              3011.3    2684.1    3185.8
  mergeAll, 33 contexts, baseline                                                 3071.6    2656.4    3301.2

  ratio (median of per-round ratios)                                                                median     p25     p75   limit
  control, getUnsafe ordinary key: this branch / this branch                                          1.00    0.97    1.01    1.05
  getUnsafe, ordinary key: this branch / baseline                                                     1.07    1.06    1.12    1.29
  getUnsafe, mixed key kinds: this branch / baseline                                                  1.09    1.07    1.10    1.29
  getUnsafe, reference default (slot absent): this branch / baseline                                  1.02    0.98    1.06    1.29
  add, ordinary key to 33 slots: this branch / baseline                                               1.04    1.01    1.07    1.29
  add, mixed key kinds: this branch / baseline                                                        1.08    1.06    1.09    1.29
  add then getUnsafe, ordinary key: this branch / baseline                                            1.07    1.04    1.10    1.29
  mergeAll, 33 one-slot contexts: this branch / baseline                                              0.99    0.97    1.00    1.29

  control envelope: 0.04 (added to every limit)

OK: every median ratio is within its limit
```

Readings. The ordinary paths are the branch point's code plus one `typeof` per read in the getters and one field check
per overlay walked in `lookup`: 1.02 to 1.09 against a limit of 1.25 plus the control's envelope. `mergeAll` is
unchanged (0.99).

### Timing, records

The full gate on the loaded machine, records mode skipped:

```
$ pnpm --filter tree-shakeable-services-spec bench:check
…
  ratio (median of per-round ratios)                                                                median     p25     p75   limit
  control, getUnsafe ordinary key: this branch / this branch                                          0.99    0.94    1.04    1.05
  getUnsafe, ordinary key: this branch / baseline                                                     1.11    1.05    1.16    1.35
  getUnsafe, mixed key kinds: this branch / baseline                                                  1.09    1.07    1.11    1.35
  getUnsafe, reference default (slot absent): this branch / baseline                                  1.08    1.04    1.10    1.35
  add, ordinary key to 33 slots: this branch / baseline                                               1.09    0.99    1.25    1.35
  add, mixed key kinds: this branch / baseline                                                        1.13    1.07    1.20    1.35
  add then getUnsafe, ordinary key: this branch / baseline                                            1.09    1.05    1.18    1.35
  mergeAll, 33 one-slot contexts: this branch / baseline                                              1.00    0.95    1.04    1.35
  record read (provided whole) / ordinary key read, same context                                      1.02    0.98    1.07    1.35
  record read (provided whole) / ordinary key read, context rebuilt per request                       1.13    1.08    1.18    1.35
  record read (member overridden underneath) / ordinary key read, context rebuilt per request         1.22    1.17    1.25    1.60
  member override into a context holding the record / ordinary add                                    1.08    1.05    1.13    1.35
  member override then record read, per request / ordinary add then read                              9.51    4.48   11.33    4.10  EXCEEDED
  record assembled from 32 member layers, context rebuilt per request / ordinary add then read        1.56    1.30    1.86    1.60
  record write / ordinary write, into 33 slots                                                       24.92   22.87   25.63   33.10
  record write / ordinary write, into 300 slots                                                      24.11   22.15   24.98   33.10
  record write into 300 slots / into 33 slots                                                         1.01    0.98    1.04    1.25
  record write / mergeAll of 33 one-slot contexts                                                     0.41    0.38    0.42    1.10
  yield* FileSystem / yield* Plain, same context                                                      1.03    1.01    1.08    1.35
  yield* FileSystem / yield* Plain, context rebuilt per request                                       1.03    0.98    1.07    1.35
  yield* FileSystem, member overridden underneath / yield* Plain, context rebuilt per request         1.08    1.01    1.13    1.60
  yield* FileSystem, member overridden per request / yield* Plain, context rebuilt per request        1.53    1.45    1.77    1.60
  provideService(FileSystem) then yield* FileSystem / provideService(Plain) then yield* Plain, per request    2.23    2.02    2.37    3.10
  yield* FileSystem from member layers (assembled) / yield* Plain, context rebuilt per request        1.07    1.01    1.11    1.60
  operation call / method call on a yielded plain record                                              0.84    0.79    0.85    1.10
  method call on the record service / on a plain record                                               1.02    0.99    1.08    1.35

  control envelope: 0.10 (added to every limit)

  absolute (median ns, reported, not gated)                                                         median     p25     p75
  getUnsafe, operation key (1 of 33 slots)                                                              26      19      27
  make, record (32 members)                                                                           3252    2729    3460
  add, record (32 members): one overlay                                                               1127     883    1162
  add a member override to a context holding the record (overlay)                                       50      42      52
  first record read after a member override (one view built and remembered)                            481     433     528
  record read, never written, remembered per flat map                                                   79      65      87

SKIPPED: the control stayed outside 1.05 after 2 attempts (21 and 31 rounds); this machine cannot be read, so nothing has been shown either way. The gate that does not depend on the machine is counts.ts.

=== summary

  counts (load-insensitive gate)           OK
  timing, ordinary keys                    OK
  timing, records                          SKIPPED

the cost gate holds: every mode is OK or SKIPPED (unreadable machine)
```

The records run, passing, at a load average of 48:

```
$ node benchmark/context/operations.ts --check
baseline: 5cd5d29096; 31 rounds, each loop about 30 ms of CPU time, A/B/B/A within a round; ns/op; records held and read in this process

  case                                                                            median       min       max
  control A: getUnsafe, ordinary key, this branch                                   24.2      18.9      38.1
  control B: getUnsafe, ordinary key, this branch                                   24.3      19.6      29.8
  getUnsafe, ordinary key, this branch                                              23.9      13.7      30.0
  getUnsafe, ordinary key, baseline                                                 21.7      12.3      25.7
  getUnsafe, mixed key kinds, this branch                                           38.3      24.5      45.2
  getUnsafe, mixed key kinds, baseline                                              34.7      27.0      39.2
  getUnsafe, reference default, this branch                                         25.3      20.2      28.1
  getUnsafe, reference default, baseline                                            23.2      17.4      25.8
  add, ordinary key, this branch                                                    47.6      42.2      53.6
  add, ordinary key, baseline                                                       43.5      34.4      50.0
  add, mixed key kinds, this branch                                                 63.2      51.4      69.9
  add, mixed key kinds, baseline                                                    56.5      45.8      61.9
  add then getUnsafe, ordinary key, this branch                                     77.8      71.8     102.5
  add then getUnsafe, ordinary key, baseline                                        67.1      48.9      77.1
  mergeAll, 33 contexts, this branch                                              2889.3    2659.5    3251.3
  mergeAll, 33 contexts, baseline                                                 2902.7    2613.5    3136.5
  getUnsafe, record provided whole, same context                                    21.9      15.5      26.6
  getUnsafe, ordinary key (record context)                                          24.4      13.6      30.1
  add then getUnsafe, record provided whole                                         86.5      77.2      95.0
  add then getUnsafe, ordinary key (record pair)                                    79.9      70.9      88.9
  add then getUnsafe, record with a member overridden underneath                   123.9     115.2     136.8
  add then getUnsafe, ordinary key (override pair)                                  79.9      68.0      91.0
  add, member override to the record context                                        50.0      45.4      54.0
  add, ordinary key (override pair)                                                 50.2      44.7      56.0
  add member override then getUnsafe record, per request                            95.2      64.9     113.9
  add then getUnsafe, ordinary key (per-request override pair)                      79.2      50.5     104.5
  add then getUnsafe, record from 32 member layers (assembled)                      85.5      49.7     107.2
  add then getUnsafe, ordinary key (members pair)                                   79.3      48.3      88.2
  add, record (32 members) to 33 slots                                            1165.2     958.4    1255.8
  add, ordinary key to 33 slots (write pair)                                        47.9      44.4      56.5
  add, record (32 members) to 300 slots                                           1140.2    1014.9    1285.7
  add, ordinary key to 300 slots                                                    47.3      34.0      51.9
  add, record (32 members) to 300 slots (size pair)                               1147.4     652.4    1251.7
  add, record (32 members) to 33 slots (size pair)                                1143.8     753.6    1261.7
  add, record (32 members) to 33 slots (merge pair)                               1157.4     686.6    1238.4
  mergeAll, 33 contexts (merge pair)                                              2905.3    2236.3    3070.1
  runSync: yield* FileSystem (record service)                                      915.3     813.3     990.8
  runSync: yield* Plain (today's record service)                                   899.0     652.6     968.9
  runSync: yield* FileSystem, context rebuilt per request                         1313.3    1002.5    1457.1
  runSync: yield* Plain, context rebuilt per request                              1292.0    1116.9    1421.0
  runSync: yield* FileSystem with a member overridden underneath, per request     1449.3    1228.4    1627.5
  runSync: yield* Plain, context rebuilt per request (override pair)              1283.2    1036.3    1501.9
  runSync: provideService(readFile) then yield* FileSystem                        1356.2     705.1    1527.5
  runSync: yield* Plain, context rebuilt per request (per-request override pair)    1294.4     724.4    1601.3
  runSync: provideService(FileSystem, record) then yield* FileSystem              2727.1    2358.1    2969.1
  runSync: provideService(Plain, record) then yield* Plain                        1277.0    1145.0    1355.0
  runSync: yield* FileSystem from member layers, per request                      1321.5    1096.6    1444.1
  runSync: yield* Plain, context rebuilt per request (members pair)               1290.7    1067.2    1408.0
  runSync: readFile(path) operation call                                           866.9     753.4    1086.9
  runSync: (yield* Plain).readFile(path)                                          1085.3     876.7    1205.0
  runSync: (yield* FileSystem).readFile(path)                                     1080.2     889.8    1221.3
  runSync: (yield* Plain).readFile(path) (record pair)                            1078.6     897.3    1182.9
  getUnsafe, operation key (1 of 33 slots)                                          27.6      17.6      34.4
  make, record (32 members)                                                       3481.1    2114.7    3825.8
  add, record (32 members): one overlay                                           1130.1     653.0    1213.8
  add a member override to a context holding the record (overlay)                   49.9      35.0      53.3
  first record read after a member override (one view built)                        97.6      58.1     102.6
  record read, never written, remembered per flat map                               84.3      68.7      91.5

  ratio (median of per-round ratios)                                                                median     p25     p75   limit
  control, getUnsafe ordinary key: this branch / this branch                                          1.01    0.98    1.03    1.05
  getUnsafe, ordinary key: this branch / baseline                                                     1.11    1.07    1.13    1.30
  getUnsafe, mixed key kinds: this branch / baseline                                                  1.11    1.10    1.13    1.30
  getUnsafe, reference default (slot absent): this branch / baseline                                  1.08    1.05    1.11    1.30
  add, ordinary key to 33 slots: this branch / baseline                                               1.10    1.07    1.12    1.30
  add, mixed key kinds: this branch / baseline                                                        1.12    1.11    1.14    1.30
  add then getUnsafe, ordinary key: this branch / baseline                                            1.19    1.15    1.25    1.30
  mergeAll, 33 one-slot contexts: this branch / baseline                                              1.00    0.98    1.01    1.30
  record read (provided whole) / ordinary key read, same context                                      0.91    0.89    0.93    1.30
  record read (provided whole) / ordinary key read, context rebuilt per request                       1.08    1.07    1.11    1.30
  record read (member overridden underneath) / ordinary key read, context rebuilt per request         1.55    1.53    1.57    2.05
  member override into a context holding the record / ordinary add                                    0.99    0.99    1.00    1.30
  member override then record read, per request / ordinary add then read                              1.24    1.17    1.30    3.05
  record assembled from 32 member layers, context rebuilt per request / ordinary add then read        1.08    1.06    1.10    1.55
  record write / ordinary write, into 33 slots                                                       23.98   23.25   24.63   33.05
  record write / ordinary write, into 300 slots                                                      24.24   23.87   24.76   33.05
  record write into 300 slots / into 33 slots                                                         1.00    0.98    1.02    1.20
  record write / mergeAll of 33 one-slot contexts                                                     0.40    0.39    0.40    1.05
  yield* FileSystem / yield* Plain, same context                                                      1.02    1.01    1.03    1.30
  yield* FileSystem / yield* Plain, context rebuilt per request                                       1.02    0.99    1.03    1.30
  yield* FileSystem, member overridden underneath / yield* Plain, context rebuilt per request         1.12    1.08    1.16    1.55
  yield* FileSystem, member overridden per request / yield* Plain, context rebuilt per request        1.04    0.99    1.08    1.55
  provideService(FileSystem) then yield* FileSystem / provideService(Plain) then yield* Plain, per request    2.14    2.08    2.18    3.05
  yield* FileSystem from member layers (assembled) / yield* Plain, context rebuilt per request        1.03    1.00    1.04    1.55
  operation call / method call on a yielded plain record                                              0.80    0.79    0.81    1.05
  method call on the record service / on a plain record                                               1.01    0.97    1.04    1.30

  control envelope: 0.05 (added to every limit)

  absolute (median ns, reported, not gated)                                                         median     p25     p75
  getUnsafe, operation key (1 of 33 slots)                                                              28      27      29
  make, record (32 members)                                                                           3481    3400    3557
  add, record (32 members): one overlay                                                               1130    1115    1153
  add a member override to a context holding the record (overlay)                                       50      49      51
  first record read after a member override (one view built)                                            98      96      99
  record read, never written, remembered per flat map                                                   84      83      86

OK: every median ratio is within its limit
```

Readings. The ordinary rows read 1.08 to 1.19 under this load (1.02 to 1.10 in the quieter runs), within 1.25 plus the
envelope. A record read from a flat map is 0.91× an ordinary read from the same context (the one-entry cache in front
of the `WeakMap` answers it) and 1.08× from a context rebuilt per request (one slot check for the request's overlay).
With a member overridden underneath it is 1.55×: one slot check per overlay, one name lookup and one small object per
read, which is why that row's limit is 2×; the fiber-level row for the same pattern is 1.12×. A member override into a
context holding the record is an ordinary add (0.99). A new override followed by a record read is 1.24× an ordinary add
followed by a read, where round 7 measured 1.1 µs for the same pattern (32 reads and a copy) and the first version of
this round's cache measured 9.5× (a `WeakMap.set` per override); the view costs 98 ns here, 55 ns in a quieter run. A
record write is 24× an ordinary write (one property read per member: 1.1 µs for 32 members under this load, 666 ns in a
quieter run), the same into 300 slots as into 33 (1.00), and 0.40× `mergeAll` of 33 one-slot contexts, the branch
point's way of providing 33 slots at once. In a fiber, `yield* FileSystem` costs what `yield* Plain` costs (1.02,
1.02), 1.12× with a member overridden underneath, 1.04× with the override per request (round 7: 2.41×), 1.03× assembled
from member layers, and providing the whole record per request is 2.1× providing a plain service per request. An
operation call is 0.80× a method call on a yielded plain record; a method call on the record service is 1.01× one on a
plain record.

## B. Tree-shaking

### What a kept key costs

A contract's declarations are calls (`Context.Operation<…>()("…")`), and a bundler keeps a top-level call it cannot
prove pure. The bundle check's annotation matrix measures the two-operation root with the contract as written, with
`/* @__PURE__ */` added to each declaration, and with `babel-plugin-annotate-pure-calls` run over the contract as
publishing it does, under esbuild and Rolldown, with `effect` itself bundled as it is published:

| Root (`main.ts`, two operations)                              |     Size | Keys kept           | Stream code |
| ------------------------------------------------------------- | -------: | ------------------- | ----------: |
| contract as written, esbuild                                  |  91.3 kB | all 30              |      1456 B |
| contract annotated `@__PURE__`, esbuild                       |  87.6 kB | readFile, writeFile |         0 B |
| contract published (`annotate-pure-calls`), esbuild           |  87.6 kB | readFile, writeFile |         0 B |
| contract as written, Rolldown                                 |  80.4 kB | all 30              |      1564 B |
| contract annotated `@__PURE__`, Rolldown                      |  77.6 kB | readFile, writeFile |         0 B |
| contract as written, `effect` from source, esbuild            | 438.3 kB | all 30              |    103.8 kB |
| contract annotated `@__PURE__`, `effect` from source, esbuild | 233.0 kB | readFile, writeFile |         0 B |

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
Bundle sizes (esm, unminified; effect as published unless noted)

  main.ts (two operation layers)                                               91.3 kB
  main-namespace.ts (two layers off a namespace)                               91.3 kB
  main-readonly.ts (ReadOnly subset, three member layers)                      91.7 kB
  main-stream.ts (one Stream operation)                                        97.0 kB
  main-twenty.ts (twenty operation layers)                                     97.3 kB
  main-record.ts (yield* FileSystem, record layer)                            112.2 kB
  main-full.ts (two operations, record layer)                                 103.9 kB
  main-terminal.ts (two terminal layers)                                       93.8 kB
  main-plain.ts (no record, no operation)                                      84.7 kB
  main-plain.ts (no record, no operation, branch point Context.ts)             83.9 kB
  main.ts (contract annotated @__PURE__, esbuild)                              87.6 kB
  main.ts (contract published (annotate-pure-calls), esbuild)                  87.6 kB
  main.ts (contract as written, rolldown)                                      80.4 kB
  main.ts (contract annotated @__PURE__, rolldown)                             77.6 kB
  main.ts (contract as written, effect from source, esbuild)                  438.3 kB
  main.ts (contract annotated @__PURE__, effect from source, esbuild)         233.0 kB

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

  this branch            84.7 kB
  branch point           83.9 kB
  difference               837 B  limit 1024 B

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

Readings. The two-operation root and the twenty-operation root differ by 6 kB: the implementations themselves are
small, and the 28 to 31 `effect` modules they share are the Effect/Layer/Context core that any program carries. The
record roots cost 12 to 21 kB more than the two-operation root: twenty-eight more implementations with their `node:fs`
bindings, and 3 kB of Stream code for the three that return Streams. A program that uses no operation and no record
pays 837 bytes for `Context.ts`: the `record` check in `lookup` and in the flatten (with the write of a record overlay's
slots into a flat map), the `typeof` dispatch in `make`, `add` and the getters, and the record key's type id; the record
code proper hangs off the record key's prototype, which such a bundle drops (the prototype objects are built with
`Object.assign` and literal property names rather than spreads and computed keys, which a bundler keeps as possible side
effects). Round 7's storage cost 419 bytes here; the 418 more are what lets a record write be one overlay instead of a
copy of the context's map.

## C. Type-level evidence

The output of `pnpm --filter tree-shakeable-services-spec check-errors`, which compiles the twenty files under
`typetest/errors` with the repository's `noErrorTruncation: true` and checks each fails for its documented reason:

```
typetest/errors/branded.ts(18,16): error TS2379: Argument of type 'Effect<string, never, "test/Legacy/readFile" & Legacy>' is not assignable to parameter of type 'Effect<string, never, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"test/Legacy/readFile" & Legacy' is not assignable to type 'never'.
typetest/errors/branded.ts(21,14): error TS2375: Type 'Layer<"test/Legacy/readFile" & Legacy, never, never>' is not assignable to type 'Layer<Legacy, never, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type 'Legacy' is not assignable to type '"test/Legacy/readFile" & Legacy'.
    Type 'Legacy' is not assignable to type '"test/Legacy/readFile"'.
typetest/errors/branded.ts(24,14): error TS2375: Type 'Effect<void, never, "test/Legacy/writeFile" & Legacy>' is not assignable to type 'Effect<void, never, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"test/Legacy/writeFile" & Legacy' is not assignable to type 'never'.
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
typetest/errors/wrong-self.ts(19,5): error TS2345: Argument of type '"test/WrongShape"' is not assignable to parameter of type '"Shape differs from the members' shape at \"writeFile\""'.
typetest/errors/wrong-self.ts(21,45): error TS2345: Argument of type '"test/Unknown"' is not assignable to parameter of type '"Give the record its identifier: Context.Operations<Self, Shape>()(key, members)"'.
typetest/errors/wrong-self.ts(23,42): error TS2554: Expected 0 arguments, but got 1.
OK: every file under typetest/errors fails to compile for the documented reason
```

The accepted limitation, in full: the record program partially provided. When two of the thirty operations are provided
to a program whose requirement is `FileSystem`, `Exclude` distributes over the union and the alias is gone; the
remaining twenty-eight keys print in full (`record-requires-all.ts(11,3)` above). TypeScript cannot keep an alias
through `Exclude`. With the default `noErrorTruncation: false` the list is cut at 160 characters with `...`. The
mitigation is the subset record: a program that needs three members names `ReadOnly`, and "provided two of three"
prints one key.

The last of the `partial-record.ts` diagnostics names the interface and the members it lacks, and nothing else, because
`Shape` declares its members directly; `partial-subset.ts` shows the same for a `Pick` alias (`ReadOnlyShape`). An
interface that extended `Context.Operations.Shape<typeof members>` would print the thirty member types of its base
instead.

What compiles (from `typetest/ok/signatures.ts`, abridged):

```ts
const read: Effect<Uint8Array, FileSystemError, "effect/FileSystem/readFile"> = FileSystem.readFile("a.txt")
const scoped: Effect<string, FileSystemError, Scope | "effect/FileSystem/makeTempFileScoped"> = FileSystem.makeTempFileScoped()
const stream: Stream<Uint8Array, FileSystemError, "effect/FileSystem/stream"> = FileSystem.stream("a.txt")
const asSlot: Context.Slot<"effect/FileSystem/readFile", (path: string) => Effect<…>> = FileSystem.readFile // an operation is a slot, not a Key
const recordAsKey: Context.Key<FileSystem, FileSystem.Shape> = FileSystem.FileSystem                // a record service is a Key
const keyString: "effect/FileSystem/readFile" = FileSystem.readFile.key
const layer: Layer<"effect/FileSystem/readFile"> = Layer.succeed(FileSystem.readFile, () => Effect.succeed(bytes))
const fromContext: (path: string) => Effect<…> = Context.get(context, FileSystem.readFile)
const implementation: Effect<(path: string) => Effect<…>, never, "effect/FileSystem/readFile"> = Effect.service(FileSystem.readFile)
const stable: Effect<number, FileSystemError, FileSystem> = backup("a.txt") // two operations, annotated with the record
const record: Effect<FileSystem.Shape, never, FileSystem> = FileSystem.FileSystem
const underRecord: Effect<number, FileSystemError, never> = backup("a.txt").pipe(Effect.provide(nodeLayer))
const recordUnderOperations: Effect<number, FileSystemError, never> = backupViaRecord("a.txt").pipe(Effect.provide(nodeLayer))
const succeeded: Layer<FileSystem> = Layer.succeed(FileSystem.FileSystem, record)
const mocked: Layer<FileSystem> = Layer.mock(FileSystem.FileSystem, { readFile: () => Effect.succeed(bytes) })
const readOnlyFromFull: Layer<FileSystem.ReadOnly> = nodeLayer                                     // subset facts 1–5
const readOnlyFromMembers: Layer<FileSystem.ReadOnly> = Layer.mergeAll(nodeExists, nodeReadFile, nodeStat)
const memberFromReadOnly: Effect<Uint8Array, FileSystemError, never> = FileSystem.readFile("a").pipe(Effect.provide(readOnlyLayer))
const readOnlyProgram: Effect<number, FileSystemError, FileSystem.ReadOnly> = sizeOf("a")
const readOnlyRecord: Effect<FileSystem.ReadOnlyShape, never, FileSystem.ReadOnly> = FileSystem.ReadOnly // a Pick alias as the shape
const width: Effect<number, never, "effect/Terminal/columns"> = Terminal.columns                   // a value operation is the Effect
const widthSlot: Context.Slot<"effect/Terminal/columns", Effect<number>> = Terminal.columns          // and a slot
const columnsMember: Terminal.Shape["columns"] = Effect.succeed(80)                                // the same Effect in the record
const columnsLayer: Layer<"effect/Terminal/columns"> = Layer.succeed(Terminal.columns, Effect.succeed(80))
const terminalRecord: Effect<Terminal.Shape, never, Terminal.Terminal> = Terminal.Terminal
const pathRecord: Effect<{ readonly sep: string; readonly join: …; readonly fromFileUrl: … }, never, Path> = Path // a mixed record
const platformIdentity: Platform = … as FileSystem.ReadOnly | Terminal.Terminal                     // a nested record
const Inferred = Context.Operations("test/Inferred", { readFile, exists })                          // no names declared
const inferredFromMembers: Layer<Context.Service.Identifier<typeof Inferred>> = Layer.mergeAll(nodeReadFile, nodeExists)
const Named = Context.Operations<Named>()("test/Named", namedMembers)                               // the identity declared, the shape inferred
const Legacy = Context.Operations<Legacy | FileSystem.ReadOnly, FileSystem.ReadOnlyShape>()("test/Legacy", {…}) // a wider identity
const legacySatisfiesMember: Effect<Uint8Array, FileSystemError, never> = FileSystem.readFile("a").pipe(Effect.provide(legacyLayer))
const parsed: Effect<number, never, "test/parse"> = parse(Number, "42")                             // generic shape naming its key
const formattedDate: Effect<string, never, "test/format"> = format(new Date(), "en")                // overloaded shape naming its key
const greeting: Effect<string, never, "test/greet"> = greeter.greet("x")                            // shape with a `this` parameter
const collected: Sink<Array<string>, string, never, never, "test/collect"> = collect("x")            // Sink.Operation
```

## D. Compile cost

`tsc --extendedDiagnostics` (the repository's TypeScript, 7.0.2 with the `effect-tsgo` patch,
`packages/effect/tsconfig.json`, `--noEmit`) at the branch point and on this branch, which carries `Context`, the
FileSystem and Terminal phase 0 and their tests:

| Metric         |    before |     after |  change |
| -------------- | --------: | --------: | ------: |
| Types          | 1,046,147 | 1,058,929 | +1.22 % |
| Instantiations | 3,801,864 | 3,874,473 | +1.91 % |

Check time is not comparable between the two runs (5.9 s at the branch point, 18.3 s on a loaded machine for this run)
and is not a criterion.

## E. Decisions, and why

The design went through eight rounds of review. What each settled, in the order an implementer meets it:

- **An operation is a `Context.Slot` that is a function, not a `Context.Key`.** A key is an Effect, and a value that
  is both callable and an Effect types one way and runs the other under every `isEffect` dispatch (the first hazard).
  Providing through a property of the operation (`op.service`) was tried and rejected as a second rule for providing;
  so was making `Key` the non-Effect brand, which broke a stable type. `Slot` is a supertype, so widening to it
  breaks nothing.
- **The result kind is fixed at the definition** (`Context.Operation`, `Stream.Operation`, `Sink.Operation`,
  `Context.Operation.value`), because a type argument is erased and a call result must be exactly one kind of value.
  One constructor dispatching on `isEffect` of the implementation, and Effect-valued members rewritten as functions of
  no arguments, were both tried; the first was the hazard again, the second changed `Terminal`'s shape. Round 8 made
  the three function constructors accept one another's shapes so that the wrong one is a message naming the right one,
  rather than a constraint error naming a type.
- **The key is written once, in the one place it is used.** A flat form taking the key from an annotation wrote it
  twice; the curried form is what `Context.Service<Self, Shape>()("key")` already does.
- **A generic or overloaded shape names its key in its result**, checked by `Derivable` at the definition, rather
  than an escape hatch at every call site.
- **The record's identity is the union of its members' keys**, declared by the author for libraries so that
  diagnostics keep the name. A prefix type (`` `effect/FileSystem/${string}` ``) prints short but cannot be shown to
  be covered by a merge of member layers; the record interface as the identity, with branded member keys, keeps
  today's names but member layers can never satisfy it, so it is used for exactly one release as phase 0.
- **The member list is the module's export list where the operations have a module**, and written out otherwise
  (round 8). A `members` helper building the operations from a table of names and kinds would keep every key in every
  bundle (measured under "What a kept key costs"); a namespace import keeps nothing a written list does not. A subset's
  shape is a `Pick` alias, which prints by name.
- **A record service is stored as one overlay when added to a context, and as its members' slots plus one slot
  holding the provided object in a flat map; a member override is an ordinary overlay.** Rounds 3 to 6 tried
  assembling on every read (three to six times a plain read), write behaviour on the key object (two keys with one
  string behaved differently), a module-level registry of records (a `Context` whose behaviour depended on what the
  process had constructed), and a per-context record index with the record rebuilt on every member write (a second
  storage system, 3.5 kB in every bundle, a flat copy per override, and class instances losing `this`). Round 7 wrote a
  record as a fresh flat map, a copy of the context's: correct, but a write whose cost grew with the context (27 µs at
  300 slots). Round 8 made the write one overlay holding the members by position, which `lookup` reads with one more
  field check per overlay, so the write is O(members) and the context is never copied. What survives is the least of
  each: the key knows its slots, the context knows nothing but that an overlay may hold several, the record's slot is
  checked against the members on the first read of each flat map and the result is remembered.
- **A view after an override inherits from the provided object and is built on each read** (round 8), instead of
  being copied and remembered. The copy cost a read of every member and a copy on the first read after every new
  override (1.1 µs for thirty-two members, 2.4× a plain `yield*` when the override is per request); remembering the
  view per override in a `WeakMap` was tried first in round 8 and cost more than the view itself (about 400 ns for the
  `WeakMap.set`, 9× an ordinary add-then-read); the view built on each read costs one object with the overriding
  members as own properties, whatever the record's size. `instanceof` and `this` hold either way; what changes is
  reflection (`Object.keys`, spread) and reference identity across reads, which the spec lists as hazards and pins by
  tests.
- **A method found on a provided object's prototype is stored bound to the object** (round 8), once per object and
  method, so that a class-based implementation works standalone as it does through the record, and a record written
  twice stores the same functions. Round 7 documented the unbound case as a hazard without preventing it.
- **No defaults.** Every reason the overridable design was set aside is a reason not to add a defaulted variant;
  `Context.Reference` remains for values that want one, and may be a member.
- **The cost gate counts first and times second** (round 8). Earlier gates took ratios of separately run medians, then
  wall-clock paired ratios with fixed limits that failed on a loaded runner without a regression in the code, then
  CPU-time paired ratios with an A/A control that exited 1 when the control was noisy, which on a loaded runner it
  usually was, and whose `&&` chaining then skipped the records mode. The counts (`Map` and `WeakMap` operations, bytes
  per call) do not depend on the machine and are the gate; the timing runs report, widen their limits by the control's
  envelope, retry once with more rounds, and report SKIPPED rather than fail when the machine cannot be read; the
  runner runs every mode whatever the previous one reported.

## F. Alternatives rejected within this design

- **A `members` helper** that builds the operations from a table of names and kinds. Removes the key strings and the
  member list from a contract, and keeps every key and the Stream wrapper in every bundle that uses one; measured
  under "What a kept key costs". The recipe under "The library recipe" is the floor.
- **Storing the record only under its own key, with members reading through it.** Would let `Layer.succeed(FileSystem,
  record)` write one slot, but a member read would walk every record spanning it and a member provided outside a
  record would lose to it: the precedence bug of slices.
- **Writing a record as a fresh flat map** (round 7) instead of one overlay. Correct and simple, but every
  `Effect.provideService(FileSystem, impl)` copied the context's map: 3.6 µs at 33 slots, 27 µs at 300. The overlay
  costs `lookup` one field check per overlay walked, which the ordinary timing rows and the counts measure.
- **Member slots as thirty-two separate overlays.** Every ordinary read through such a context would walk thirty-two
  overlays before reaching its slot, and `maxDepth` would flatten the chain at once; one overlay holding the members by
  position is the same write cost with one comparison for the walk.
- **Remembering the view after an override**, in the key's `WeakMap` keyed by the override overlay, or in a field of
  the overlay. The first cost a `WeakMap.set` per new override, several times the view it saved; the second two fields
  on every overlay, which every ordinary `add` allocates. The view is built on each read; the `WeakMap` and the
  one-entry cache in front of it remember only assembled objects, once per flat map.
- **Rebuilding the record on every member write** (round 6) instead of checking on read. Keeps the record read at
  one lookup with no overlay scan, at the price of a flat copy and a thirty-member rebuild on every override, a
  per-context index of records, and a record read that was not the provided object after any override.
- **Class-style operations** (`class ReadFile extends Context.Operation<…>()("…") {}`). A class cannot be called
  without `new`.
- **An identifier type parameter for operations** (`Operation<Self, Shape>`). Two operations with the same shape
  would alias in `R` unless each carried a brand; the key string is already unique and already nominal, and it prints
  better in errors. The optional `Brand` argument covers the migration case without making it the rule.
- **The key in the wrong-kind message** (`The shape of "test/stream" returns a Stream…`). TypeScript infers the key
  literal only from a branch of `KeyFor` that is the type parameter itself; a message built from it printed `${string}`
  in the key's place, so the message names the constructor to use and not the key.
