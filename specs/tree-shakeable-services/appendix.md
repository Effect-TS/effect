# Tree-shakeable services: appendix

The evidence behind [the spec](../tree-shakeable-services.md), the later migration phases in detail, and the record of
the decisions that shaped the design. Every table here is the output of a command on this branch, named above it, run
on the commit whose `packages/` tree is the one reviewed; nothing in this file is normative.

## A. Cost

### Method

Three measurements, run in order by `pnpm --filter tree-shakeable-services-spec bench:check`
(`specs/tree-shakeable-services/scripts/bench-check.ts`), each against the `Context.ts` of the branch point
(`git merge-base HEAD origin/v4/next-minor`, `7997bf786b`), loaded beside this branch's in the same process so both run
against the same `effect` runtime:

1. **Counts** (`packages/effect/benchmark/context/counts.ts --check`). `Map.prototype.get`, `has` and `set`, and
   `WeakMap.prototype.get` and `set`, are replaced by counting wrappers for the duration of one call, after a warm-up
   call and, for operations with a per-storage cache, after the first call so that the steady state is counted. A `Map`
   copied with `new Map(map)` calls the replaced `set` once per entry, so a copy of a context's map counts as its size.
   Bytes are the growth of the heap over four thousand calls whose results are kept, after a full collection and with
   none in between (a run in which one happens is discarded), per call, after a hundred thousand warm-up calls so the
   code is optimized; the smallest of five runs, rounded to eight bytes. Counts do not depend on the machine's load.
   This is the gate a continuous integration runner applies.
2. **Timing, ordinary keys** (`operations.ts --ordinary`), in a process that holds no record.
3. **Timing, records** (`operations.ts`), in a process that holds records and reads them, and runs fibers.

The timing method: every ratio is paired and interleaved; within a round, the two sides of a pair run as A, B, B, A in
tight loops of a calibrated iteration count (about 30 ms each), and the round's ratio is the CPU time
(`process.cpuUsage`, user plus system, so that time preempted by another process is not charged) of the two A loops
over the two B loops. The number reported is the median of the per-round ratios over 21 rounds, with the 25th and 75th
percentiles beside it. The first pair is an A/A control, the same loop on both sides; its envelope (the larger of its
median's distance from 1.00 and its interquartile range) is added to every limit. A run whose control is outside 1.05
is repeated once with ten more rounds; if the control is still outside, the run reports SKIPPED: the machine cannot be
read, nothing has been shown either way, and the runner continues with the next mode. Before anything is calibrated,
every case runs a little, round-robin, so that the optimiser compiles the getters having seen every key shape and
every path, as it would in a program past its start-up. Both modules are warmed with the same six key shapes, and with
references read while absent. Absolute costs are reported and not gated.

**Three orders.** The same two closures, in the same process, can differ by a few nanoseconds depending on the order
in which the cases were calibrated, optimised and laid out, with the A/A control none the wiser, since it compares a
closure with itself. So the runner measures each timing mode in three processes with the pairs in three orders
(`BENCH_SEED=0,1,2`, a deterministic shuffle after the control) and gates the median of the three medians, with the
limits widened by the largest envelope of the readable runs; a mode whose three controls are all too noisy is SKIPPED.
The per-order tables are in the run's output; the combined tables are pasted below with one full order each.

**What is gated where.** The rows that compare this branch with itself (a record read against an ordinary read, a
record write against an ordinary write, `yield*` of a record against `yield*` of a plain service) are gated in both
modes. The rows that compare this branch with the branch point are gated in the ordinary-keys mode, where both modules
serve the same calls, and reported in the records mode, where this branch's module serves the whole runtime while the
copy of the branch point serves the benchmark alone; the records mode measures that asymmetry directly, with the code
held equal, by loading a second, pristine copy of this branch's own `Context.ts` ("a pristine copy of this branch")
and comparing the live module with it. The reasoning and the experiments behind this are under "The ordinary rows in
the records process".

The runner's summary lists each mode as OK, SKIPPED or EXCEEDED; the gate fails only on EXCEEDED. The run pasted below
is the whole gate on a shared eight-core machine, where the controls of the ordinary mode were readable in one order
of three (0.04; the others 0.06 and 0.12 after their retry) and those of the records mode in all three (0.02 to 0.03).

### Counts

```
$ node benchmark/context/counts.ts --check
baseline: 7997bf786b; operations and bytes per call

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
  add, ordinary key to 33 slots, this branch                                              0        0        0         0         0     144
  add, ordinary key to 33 slots, baseline                                                 0        0        0         0         0     144
  add then getUnsafe, ordinary key, this branch                                           1        0        0         0         0     144
  add then getUnsafe, ordinary key, baseline                                              1        0        0         0         0     144
  make, ordinary key, this branch                                                         0        0        1         0         0     528
  make, ordinary key, baseline                                                            0        0        1         0         0     528
  mergeAll, 33 one-slot contexts, this branch                                             0        0       33         0         0    3032
  mergeAll, 33 one-slot contexts, baseline                                                0        0       33         0         0    5696

records, this branch

  case                                                                              Map.get  Map.has  Map.set  Weak.get  Weak.set   bytes
  add, record (32 members) to 33 slots                                                    0        0        0         0         0     456
  add, record (32 members) to 300 slots                                                   0        0        0         0         0     456
  make, record (32 members)                                                               0        0       33         0         0    4192
  getUnsafe, member through a record overlay                                              1        0        0         0         0       0
  getUnsafe, record through a record overlay                                              0        0        0         0         0       0
  getUnsafe, record in a flat map, same context                                           0        0        0         0         0       0
  getUnsafe, record in a flat map, through one overlay                                    0        1        0         0         0       0
  add then getUnsafe, record in a flat map, context rebuilt per request                   0        1        0         0         0       0
  add, member override to a context holding the record                                    0        0        0         0         0     144
  getUnsafe, record with a member overridden underneath, through one overlay              0        2        0         0         0       0
  add member override then getUnsafe record, per request (new override each time)         1        1        0         1         0     312
  getUnsafe, record never written, first read of a storage                                0        1        0         0         0       0
  getUnsafe, record never written, later read                                             0        0        0         0         0       0

OK: every count is as stated
```

Readings. Every ordinary-key operation performs the same `Map` operations and allocates the same bytes on this branch
as at the branch point; an ordinary overlay is the branch point's 144 bytes again (round 8 carried a `record` field on
every overlay, 152 bytes). The `mergeAll` bytes differ between the two modules (3,032 against 5,696) in every run of
every round, on this branch and at the branch point alike, and are reported, not gated: the row copies thirty-three
one-entry maps into one, and the heap growth of a `Map` of that size is what the allocator happens to reserve for it,
which differs between the two module instances. A record written into a context performs no `Map` operation: one
overlay (144 bytes) with an array of the thirty-three slots, 456 bytes in all, into 33 slots and into 300 alike (840
bytes in round 8, when the overlay held a second object). `make` of a record is 33 `Map.set`, one per slot of the fresh
flat map. A member read through a record overlay is one `Map.get` (the member's position). A record read from a record
overlay performs no lookup at all; from a flat map it is one `Map.has` per overlay walked (the check that the overlay
does not hold one of the record's slots) and then the remembered object, with nothing allocated; with a member
overridden underneath, one `Map.has` for the per-request overlay and one for the override, then the remembered view. A
new override followed by a record read is one `Map.get` (the member's name), one `Map.has`, one `WeakMap.get` (the
record below the override) and one copy of the record, 312 bytes with the overlay, and no `WeakMap.set`: the view is
kept in the key's one-entry cache only.

### Timing, ordinary keys

The combined table, and the one readable order in full:

```
=== timing, ordinary keys: the median of the 1 readable runs (orders 1)

  ratio (median over runs of the median per run)                                                    median                 runs   limit
  getUnsafe, ordinary key: this branch / baseline                                                     1.18                 1.18     1.29
  getUnsafe, mixed key kinds: this branch / baseline                                                  1.06                 1.06     1.29
  getUnsafe, reference default (slot absent): this branch / baseline                                  1.07                 1.07     1.29
  add, ordinary key to 33 slots: this branch / baseline                                               0.95                 0.95     1.29
  add, mixed key kinds: this branch / baseline                                                        1.09                 1.09     1.29
  add then getUnsafe, ordinary key: this branch / baseline                                            1.07                 1.07     1.29
  mergeAll, 33 one-slot contexts: this branch / baseline                                              1.00                 1.00     1.29

  largest control envelope: 0.04 (added to every limit)

OK: every median ratio is within its limit
```

```
=== timing, ordinary keys, order 1: BENCH_SEED=1 node operations.ts --ordinary

baseline: 7997bf786b; 21 rounds, each loop about 30 ms of CPU time, A/B/B/A within a round; ns/op; ordinary keys only (no record is held or read in this process)

  case                                                                            median       min       max
  control A: getUnsafe, ordinary key, this branch                                   14.2      13.1      25.2
  control B: getUnsafe, ordinary key, this branch                                   14.1      13.0      34.2
  add, ordinary key, this branch                                                    25.9      22.4      58.1
  add, ordinary key, baseline                                                       26.0      19.8     140.1
  getUnsafe, ordinary key, this branch                                              14.7      13.8      28.6
  getUnsafe, ordinary key, baseline                                                 12.4      11.7      22.8
  add, mixed key kinds, this branch                                                 31.6      29.5      62.0
  add, mixed key kinds, baseline                                                    29.3      27.9      52.2
  mergeAll, 33 contexts, this branch                                              1468.4    1424.1    2961.2
  mergeAll, 33 contexts, baseline                                                 1463.0    1434.2    2902.6
  getUnsafe, mixed key kinds, this branch                                           20.7      20.3      39.6
  getUnsafe, mixed key kinds, baseline                                              19.7      19.0      34.8
  getUnsafe, reference default, this branch                                         15.3      14.4      23.9
  getUnsafe, reference default, baseline                                            14.4      12.1      69.9
  add then getUnsafe, ordinary key, this branch                                     41.4      36.9      80.7
  add then getUnsafe, ordinary key, baseline                                        38.3      35.4      81.0

  ratio (median of per-round ratios)                                                                median     p25     p75   limit
  control, getUnsafe ordinary key: this branch / this branch                                          1.01    0.99    1.03     1.05
  add, ordinary key to 33 slots: this branch / baseline                                               0.95    0.90    1.03     1.29
  getUnsafe, ordinary key: this branch / baseline                                                     1.18    1.15    1.20     1.29
  add, mixed key kinds: this branch / baseline                                                        1.09    1.06    1.13     1.29
  mergeAll, 33 one-slot contexts: this branch / baseline                                              1.00    0.99    1.01     1.29
  getUnsafe, mixed key kinds: this branch / baseline                                                  1.06    1.05    1.08     1.29
  getUnsafe, reference default (slot absent): this branch / baseline                                  1.07    1.04    1.11     1.29
  add then getUnsafe, ordinary key: this branch / baseline                                            1.07    1.05    1.10     1.29

  control envelope: 0.04 (added to every limit)
```

Readings. The ordinary paths are the branch point's code plus one `typeof` per read in the getters and one `typeof`
per overlay walked in `lookup`: 0.95 to 1.18 against a limit of 1.25 plus the control's envelope, with the flat read
(12.4 against 14.7 ns, about two nanoseconds) the largest. `mergeAll` is unchanged (1.00). The two unreadable orders
of this run (controls 0.06 and 0.12 after their retries) had the same rows between 1.05 and 1.14 and 1.09 and 1.19.

### Timing, records

The combined table, and order 0 in full:

```
=== timing, records: the median of the 3 readable runs (orders 0, 1, 2)

  ratio (median over runs of the median per run)                                                    median                 runs   limit
  getUnsafe, ordinary key: this branch / baseline                                                     1.41       1.49 1.41 1.18 reported
  getUnsafe, mixed key kinds: this branch / baseline                                                  1.09       1.09 1.10 1.07 reported
  getUnsafe, reference default (slot absent): this branch / baseline                                  1.47       1.49 1.47 1.10 reported
  add, ordinary key to 33 slots: this branch / baseline                                               1.13       1.17 1.13 1.08 reported
  add, mixed key kinds: this branch / baseline                                                        1.08       1.09 1.08 1.07 reported
  add then getUnsafe, ordinary key: this branch / baseline                                            1.22       1.22 1.24 1.14 reported
  mergeAll, 33 one-slot contexts: this branch / baseline                                              1.00       1.00 1.05 1.00 reported
  getUnsafe, ordinary key: this branch / a pristine copy of this branch                               1.27       1.29 1.27 1.01 reported
  getUnsafe, reference default (slot absent): this branch / a pristine copy of this branch            1.50       1.50 1.52 1.05 reported
  add then getUnsafe, ordinary key: this branch / a pristine copy of this branch                      1.21       1.23 1.21 1.14 reported
  record read (provided whole) / ordinary key read, same context                                      0.69       0.65 0.69 0.87     1.28
  record read (provided whole) / ordinary key read, context rebuilt per request                       0.98       0.93 0.98 1.01     1.28
  record read (member overridden underneath) / ordinary key read, context rebuilt per request         1.07       1.01 1.07 1.08     1.53
  member override into a context holding the record / ordinary add                                    1.05       1.02 1.05 1.08 reported
  member override then record read, per request / ordinary add then read                              2.58       2.58 2.58 2.74     8.03
  record assembled from 32 member layers, context rebuilt per request / ordinary add then read        0.97       0.91 0.97 0.99     1.53
  record write / ordinary write, into 33 slots                                                       17.80    19.82 17.25 17.80    33.03
  record write / ordinary write, into 300 slots                                                      18.06    19.44 18.06 17.81    33.03
  record write into 300 slots / into 33 slots                                                         0.99       0.99 1.01 0.99     1.18
  record write / mergeAll of 33 one-slot contexts                                                     0.32       0.32 0.32 0.31     1.03
  yield* FileSystem / yield* Plain, same context                                                      1.02       1.00 1.02 1.03     1.28
  yield* FileSystem / yield* Plain, context rebuilt per request                                       1.02       1.01 1.02 1.03     1.28
  yield* FileSystem, member overridden underneath / yield* Plain, context rebuilt per request         1.09       1.07 1.09 1.09     1.53
  yield* FileSystem, member overridden per request / yield* Plain, context rebuilt per request        2.78       2.79 2.78 2.76     3.03
  provideService(FileSystem) then yield* FileSystem / provideService(Plain) then yield* Plain, per request    1.85       1.83 1.89 1.85     3.03
  yield* FileSystem from member layers (assembled) / yield* Plain, context rebuilt per request        1.05       1.00 1.05 1.05     1.53
  operation call / method call on a yielded plain record                                              0.84       0.84 0.87 0.83     1.03
  method call on the record service / on a plain record                                               1.01       1.01 1.02 1.01 reported

  largest control envelope: 0.03 (added to every limit)

OK: every median ratio is within its limit
```

```
=== timing, records, order 0: BENCH_SEED=0 node operations.ts

baseline: 7997bf786b; 21 rounds, each loop about 30 ms of CPU time, A/B/B/A within a round; ns/op; records held and read in this process

  case                                                                            median       min       max
  control A: getUnsafe, ordinary key, this branch                                   18.2      16.5      35.0
  control B: getUnsafe, ordinary key, this branch                                   18.4      16.8      30.8
  getUnsafe, ordinary key, this branch                                              17.8      16.6      35.9
  getUnsafe, ordinary key, baseline                                                 11.9      11.0     131.6
  getUnsafe, mixed key kinds, this branch                                           21.5      20.9      43.7
  getUnsafe, mixed key kinds, baseline                                              19.6      17.9      92.7
  getUnsafe, reference default, this branch                                         23.2      20.5      48.2
  getUnsafe, reference default, baseline                                            15.6      13.2      87.7
  add, ordinary key, this branch                                                    27.4      21.5      60.8
  add, ordinary key, baseline                                                       22.3      20.8      56.2
  add, mixed key kinds, this branch                                                 32.6      31.0      61.1
  add, mixed key kinds, baseline                                                    30.4      28.4      58.2
  add then getUnsafe, ordinary key, this branch                                     45.6      41.3     142.4
  add then getUnsafe, ordinary key, baseline                                        36.8      34.2     136.1
  mergeAll, 33 contexts, this branch                                              1487.9    1428.7    2848.3
  mergeAll, 33 contexts, baseline                                                 1490.2    1428.8    2886.8
  getUnsafe, ordinary key, this branch (twin pair)                                  18.1      16.4      30.9
  getUnsafe, ordinary key, pristine copy of this branch                             14.0      13.1      43.0
  getUnsafe, reference default, this branch (twin pair)                             23.5      20.6      59.8
  getUnsafe, reference default, pristine copy of this branch                        15.6      13.3     116.1
  add then getUnsafe, ordinary key, this branch (twin pair)                         46.9      43.0     114.9
  add then getUnsafe, ordinary key, pristine copy of this branch                    38.7      34.4     289.5
  getUnsafe, record provided whole, same context                                    11.6      11.2      23.8
  getUnsafe, ordinary key (record context)                                          17.7      16.4      31.4
  add then getUnsafe, record provided whole                                         42.5      38.2     111.9
  add then getUnsafe, ordinary key (record pair)                                    47.0      42.9     104.8
  add then getUnsafe, record with a member overridden underneath                    47.3      41.7     114.0
  add then getUnsafe, ordinary key (override pair)                                  46.1      42.9     109.9
  add, member override to the record context                                        24.1      22.3      65.7
  add, ordinary key (override pair)                                                 23.6      22.4      55.9
  add member override then getUnsafe record, per request                           116.3     108.4     355.8
  add then getUnsafe, ordinary key (per-request override pair)                      45.3      42.6     101.7
  add then getUnsafe, record from 32 member layers (assembled)                      41.2      38.4      85.2
  add then getUnsafe, ordinary key (members pair)                                   45.4      42.3      96.3
  add, record (32 members) to 33 slots                                             484.8     467.7     990.7
  add, ordinary key to 33 slots (write pair)                                        25.0      21.8      91.7
  add, record (32 members) to 300 slots                                            486.9     468.0     902.8
  add, ordinary key to 300 slots                                                    25.3      21.4      68.8
  add, record (32 members) to 300 slots (size pair)                                486.1     469.9     940.6
  add, record (32 members) to 33 slots (size pair)                                 490.8     469.4     909.4
  add, record (32 members) to 33 slots (merge pair)                                492.2     471.1    1141.7
  mergeAll, 33 contexts (merge pair)                                              1521.6    1460.6    2991.1
  runSync: yield* FileSystem (record service)                                      437.0     416.9     968.7
  runSync: yield* Plain (today's record service)                                   437.3     422.1     898.5
  runSync: yield* FileSystem, context rebuilt per request                          625.5     591.1    1239.9
  runSync: yield* Plain, context rebuilt per request                               619.9     603.5     983.0
  runSync: yield* FileSystem with a member overridden underneath, per request      659.2     637.6    1387.7
  runSync: yield* Plain, context rebuilt per request (override pair)               619.4     586.6    1306.7
  runSync: provideService(readFile) then yield* FileSystem                        1745.9    1656.6    3511.1
  runSync: yield* Plain, context rebuilt per request (per-request override pair)     625.3     600.2    1198.1
  runSync: provideService(FileSystem, record) then yield* FileSystem              1112.8    1064.3    1956.1
  runSync: provideService(Plain, record) then yield* Plain                         610.7     591.8    1262.7
  runSync: yield* FileSystem from member layers, per request                       638.3     600.8    1300.5
  runSync: yield* Plain, context rebuilt per request (members pair)                631.7     598.5    1255.3
  runSync: readFile(path) operation call                                           447.6     433.7     924.2
  runSync: (yield* Plain).readFile(path)                                           534.0     510.6    1025.7
  runSync: (yield* FileSystem).readFile(path)                                      544.6     523.3    1120.3
  runSync: (yield* Plain).readFile(path) (record pair)                             534.1     520.0    1142.1
  getUnsafe, operation key (1 of 33 slots)                                          18.1      17.0      27.8
  make, record (32 members)                                                       1723.3    1518.4    3339.2
  add, record (32 members): one overlay                                            489.2     471.5     921.6
  add a member override to a context holding the record (overlay)                   26.8      22.8      93.3
  first record read after a member override (one view built)                       117.9     112.5     246.7
  record read, never written, remembered per flat map                               41.1      38.6      82.1

  ratio (median of per-round ratios)                                                                median     p25     p75   limit
  control, getUnsafe ordinary key: this branch / this branch                                          1.01    0.99    1.02     1.05
  getUnsafe, ordinary key: this branch / baseline                                                     1.49    1.44    1.51 reported
  getUnsafe, mixed key kinds: this branch / baseline                                                  1.09    1.04    1.13 reported
  getUnsafe, reference default (slot absent): this branch / baseline                                  1.49    1.45    1.58 reported
  add, ordinary key to 33 slots: this branch / baseline                                               1.17    1.09    1.20 reported
  add, mixed key kinds: this branch / baseline                                                        1.09    1.06    1.11 reported
  add then getUnsafe, ordinary key: this branch / baseline                                            1.22    1.17    1.27 reported
  mergeAll, 33 one-slot contexts: this branch / baseline                                              1.00    0.99    1.02 reported
  getUnsafe, ordinary key: this branch / a pristine copy of this branch                               1.29    1.27    1.32 reported
  getUnsafe, reference default (slot absent): this branch / a pristine copy of this branch            1.50    1.46    1.60 reported
  add then getUnsafe, ordinary key: this branch / a pristine copy of this branch                      1.23    1.19    1.27 reported
  record read (provided whole) / ordinary key read, same context                                      0.65    0.64    0.68     1.28
  record read (provided whole) / ordinary key read, context rebuilt per request                       0.93    0.89    0.96     1.28
  record read (member overridden underneath) / ordinary key read, context rebuilt per request         1.01    0.99    1.03     1.53
  member override into a context holding the record / ordinary add                                    1.02    1.01    1.04 reported
  member override then record read, per request / ordinary add then read                              2.58    2.51    2.60     8.03
  record assembled from 32 member layers, context rebuilt per request / ordinary add then read        0.91    0.90    0.95     1.53
  record write / ordinary write, into 33 slots                                                       19.82   18.15   20.33    33.03
  record write / ordinary write, into 300 slots                                                      19.44   18.23   20.38    33.03
  record write into 300 slots / into 33 slots                                                         0.99    0.98    1.01     1.18
  record write / mergeAll of 33 one-slot contexts                                                     0.32    0.32    0.33     1.03
  yield* FileSystem / yield* Plain, same context                                                      1.00    0.99    1.01     1.28
  yield* FileSystem / yield* Plain, context rebuilt per request                                       1.01    0.99    1.01     1.28
  yield* FileSystem, member overridden underneath / yield* Plain, context rebuilt per request         1.07    1.05    1.08     1.53
  yield* FileSystem, member overridden per request / yield* Plain, context rebuilt per request        2.79    2.76    2.85     3.03
  provideService(FileSystem) then yield* FileSystem / provideService(Plain) then yield* Plain, per request    1.83    1.80    1.84     3.03
  yield* FileSystem from member layers (assembled) / yield* Plain, context rebuilt per request        1.00    0.99    1.03     1.53
  operation call / method call on a yielded plain record                                              0.84    0.83    0.85     1.03
  method call on the record service / on a plain record                                               1.01    0.99    1.04 reported

  control envelope: 0.03 (added to every limit)

  absolute (median ns, reported, not gated)                                                         median     p25     p75
  getUnsafe, operation key (1 of 33 slots)                                                              18      18      18
  make, record (32 members)                                                                           1723    1565    1824
  add, record (32 members): one overlay                                                                489     477     498
  add a member override to a context holding the record (overlay)                                       27      25      30
  first record read after a member override (one view built)                                           118     115     122
  record read, never written, remembered per flat map                                                   41      40      42
```

Readings, the gated rows first. A record read from a flat map is 0.69× an ordinary read from the same context (the
one-entry cache answers it) and 0.98× from a context rebuilt per request (one slot check for the request's overlay);
with a member overridden underneath it is 1.07× (one slot check per overlay, then the remembered view), where round 8
measured 1.55×. A member override into a context holding the record is an ordinary add (1.05). A new override followed
by a record read is 2.58× an ordinary add followed by a read: 118 ns for a copy of the thirty-two members (one `WeakMap`
lookup for the record beneath, one copy, no entry kept), where round 8's view of one own property cost 98 ns and did not
spread. A record write is 18× an ordinary write (one property read per member and one array: 485 ns for 32 members), the
same into 300 slots as into 33 (0.99), and 0.32× `mergeAll` of 33 one-slot contexts, the branch point's way of
providing 33 slots at once. In a fiber, `yield* FileSystem` costs what `yield* Plain` costs (1.02, 1.02), 1.09× with a
member overridden underneath, 2.78× with the override per request (one copy of the record per request; round 7 copied
every member and measured 2.41× before the view existed), 1.05× assembled from member layers, and providing the whole
record per request is 1.85× providing a plain service per request. An operation call is 0.84× a method call on a
yielded plain record; a method call on the record service is 1.01× one on a plain record.

### The ordinary rows in the records process

In the records process the ordinary rows against the branch point read 1.41× for a flat read and 1.47× for a reference
default, where the same rows in the ordinary process read 1.18× and 1.07×. Round 8 reported this as a regression of
the ordinary path once a record is held. The experiments of this round, all on this code, all with tight controls:

| Experiment (records mode)                                                                                                      | `getUnsafe`, ordinary key | reference default |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------: | ----------------: |
| pairs in list order                                                                                                            |                      1.32 |              1.47 |
| the same pairs, order reversed                                                                                                 |                      1.06 |              1.03 |
| list order, the record read taken out of the getters' bodies (dispatch split into two functions)                               |                      1.28 |              1.53 |
| list order, `yield*` of a record no longer passing through `getUnsafe` (the record's own `evaluate`)                           |                      1.32 |              1.55 |
| list order, without the warm-up of both modules                                                                                |                      1.32 |              1.58 |
| list order, every case primed round-robin before calibration (what the gate does now), two orders                              |                1.34, 1.34 |        1.55, 1.49 |
| primed, **this branch against a pristine copy of its own `Context.ts`** (identical code, the copy serving the benchmark alone) |                      1.25 |              1.65 |
| primed, the ordinary process (no fibers, no records)                                                                           |                      1.09 |              1.05 |

The last two rows settle it. With the code held equal, the module that serves the runtime reads an ordinary key 1.25×
slower than a copy of itself that serves nothing but the benchmark's calls, and a reference default 1.65× slower; the
difference between this branch and the branch point in the same process is the same size. So the records-process rows
measure what serving a whole program costs a getter, not a difference between the two codes: the live module's getters
see every key the fibers read (references with and without a cached default, class keys, operations, records) and are
compiled for all of them, while a module serving the benchmark alone is compiled for four shapes. The branch point's
`Context.ts` would pay the same in the live role; it cannot be put there, since the runtime is bound to this branch's.
What was ruled out on the way: the shape of the dispatch (a `typeof` in the getter or a split into two functions), the
record read passing through the getters, the warm-up, inline-cache state at the `key` loads (`--log-ic` shows both
modules' loads reach the same megamorphic state), dictionary-mode properties on the keys or contexts (none), and
deoptimisation loops (`--trace-deopt` shows a handful of one-time deoptimisations). The order sensitivity without
priming is the optimiser compiling the getters for the first cases alone and recompiling, with more general code, when
the record and fiber cases arrive; priming every case before calibration removes it, which is why the gate primes.

Consequences for the gate: the ordinary rows against the branch point are gated in the ordinary process, where both
modules are in the same role, and reported in the records process beside the twin rows; the counts gate, which does
not depend on code layout, is identical for every ordinary row; the limits stay at 1.25.

## B. Tree-shaking

### What a kept key costs

A contract's declarations are calls (`Context.Operation<…>()("…")`), and a bundler keeps a top-level call it cannot
prove pure. The bundle check's annotation matrix measures the two-operation root with the contract as written, with
`/* @__PURE__ */` added to each declaration, and with `babel-plugin-annotate-pure-calls` run over the contract as
publishing it does, under esbuild and Rolldown, with `effect` itself bundled as it is published:

| Root (`main.ts`, two operations)                              |     Size | Keys kept           | Stream code |
| ------------------------------------------------------------- | -------: | ------------------- | ----------: |
| contract as written, esbuild                                  |  91.1 kB | all 30              |      1456 B |
| contract annotated `@__PURE__`, esbuild                       |  87.4 kB | readFile, writeFile |         0 B |
| contract published (`annotate-pure-calls`), esbuild           |  87.4 kB | readFile, writeFile |         0 B |
| contract as written, Rolldown                                 |  80.2 kB | all 30              |      1564 B |
| contract annotated `@__PURE__`, Rolldown                      |  77.4 kB | readFile, writeFile |         0 B |
| contract as written, `effect` from source, esbuild            | 439.0 kB | all 30              |    103.8 kB |
| contract annotated `@__PURE__`, `effect` from source, esbuild | 233.7 kB | readFile, writeFile |         0 B |

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

  main.ts (two operation layers)                                               91.1 kB
  main-namespace.ts (two layers off a namespace)                               91.1 kB
  main-readonly.ts (ReadOnly subset, three member layers)                      91.5 kB
  main-stream.ts (one Stream operation)                                        96.8 kB
  main-twenty.ts (twenty operation layers)                                     97.1 kB
  main-record.ts (yield* FileSystem, record layer)                            113.0 kB
  main-full.ts (two operations, record layer)                                 103.7 kB
  main-terminal.ts (two terminal layers)                                       94.7 kB
  main-plain.ts (no record, no operation)                                      84.5 kB
  main-plain.ts (no record, no operation, branch point Context.ts)             83.9 kB
  main.ts (contract annotated @__PURE__, esbuild)                              87.4 kB
  main.ts (contract published (annotate-pure-calls), esbuild)                  87.4 kB
  main.ts (contract as written, rolldown)                                      80.2 kB
  main.ts (contract annotated @__PURE__, rolldown)                             77.4 kB
  main.ts (contract as written, effect from source, esbuild)                  439.0 kB
  main.ts (contract annotated @__PURE__, effect from source, esbuild)         233.7 kB

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
  this branch              84.5 kB     48.0 kB
  branch point             83.9 kB     47.6 kB
  difference                 636 B       390 B  limit 512 B minified

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

The no-record root carries 636 bytes of `Context.ts` over the branch point as esbuild prints it (indentation and line
breaks included) and 390 bytes minified, which is the form a bundle ships in and the one the check gates at 512 bytes:
the record-overlay branch in `lookup` and in the flatten, the `isRecordKey` test in `make`, `add`, `pick`, `omit` and
the getters, and the `OperationsTypeId` string. Round 8 printed 837 bytes and had widened its gate to 1 kB to fit.

## C. Type-level evidence

The output of `pnpm --filter tree-shakeable-services-spec check-errors`, which compiles the nineteen files under
`typetest/errors` with the repository's `noErrorTruncation: true` and checks each fails for its documented reason:

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
typetest/errors/wrong-self.ts(19,5): error TS2345: Argument of type '"test/WrongShape"' is not assignable to parameter of type '"Shape differs from the members' shape at \"writeFile\""'.
typetest/errors/wrong-self.ts(21,45): error TS2345: Argument of type '"test/Unknown"' is not assignable to parameter of type '"Give the record its identifier: Context.Operations<Self, Shape>()(key, members)"'.
typetest/errors/wrong-self.ts(23,42): error TS2554: Expected 0 arguments, but got 1.

OK: every file under typetest/errors fails to compile for the documented reason
```

Two of these are the facts under "Type-level evidence" in the spec: `record-requires-all.ts(8,19)` is the record
program run unprovided, which prints the record's name, and `record-requires-all.ts(11,3)` is the same program with
two of its thirty operations provided, which prints the twenty-eight remaining keys in full (`missing-twenty.ts(48,19)`
is the twenty-operation program with three left, which prints three). The positive assertions, 322 lines of
`typetest/ok/signatures.ts`, compile under `pnpm --filter tree-shakeable-services-spec check`; the repository's own
type tests are `packages/effect/typetest/Context.tst.ts` (13 tests) and `FileSystem.tst.ts` (3 tests), 103 assertions
under `tstyche`.

## D. Compile cost

`tsc --extendedDiagnostics` (the repository's TypeScript, 7.0.2 with the `effect-tsgo` patch,
`packages/effect/tsconfig.json`, `--noEmit`, no incremental cache) at the branch point and on this branch, which carries
`Context`, the FileSystem and Terminal migrations with `ReadOnly`, and their tests:

| Metric         |    before |     after |  change |
| -------------- | --------: | --------: | ------: |
| Types          | 1,046,206 | 1,060,233 | +1.34 % |
| Instantiations | 3,801,554 | 3,879,949 | +2.06 % |

Check time is 5.3 s against 5.2 s and is not a criterion.

## E. Phases 2 and 3 in detail

The spec states the phases in a paragraph; this is the layout an implementer builds.

**Phase 2, `effect/FileSystem`, Node.** In `packages/platform/node-shared`: one module per primitive operation,
`src/NodeFileSystem/<op>.ts`, each exporting `Layer.succeed(FileSystem.<op>, impl)` built from the function
`NodeFileSystem.ts` already has for that member (`watch` is `Layer.effect` over `serviceOption(WatchBackend)`); a
barrel `src/NodeFileSystem/index.ts` with `export *` so that `import * as NodeFileSystem from
"@effect/platform-node-shared/NodeFileSystem"` and `NodeFileSystem.readFile` shake as the bundle test's `node/index.ts`
does. The derived operations (`exists`, `glob`, `readFileString`, `stream`, `sink`, `writeFileString`) are
platform-independent: `effect/FileSystem` ships each as a layer over the primitives it needs, for example
`layerReadFileString: Layer<"effect/FileSystem/readFileString", never, "effect/FileSystem/readFile">`, and each
platform's module for a derived operation is that layer provided with the platform's primitive. `NodeFileSystem.layer`
keeps its name, type, module and form, `Layer.effect(FileSystem, make({...}))` built from the same per-operation
functions, which provides the record whole, and lives apart from the barrel so importing one operation does not import
thirty. After this phase a program that calls two operations and provides `NodeFileSystem.readFile` and
`NodeFileSystem.writeFile` bundles two implementations; a program that still provides `NodeFileSystem.layer` behaves
as before. Deno gets the same layout in `DenoFileSystem`; Bun re-exports Node's.

**Phase 2, `effect/Terminal`.** `NodeTerminal` becomes one module per member. `columns`, `rows` and `display` are
one-liners over `process.stdout`: `Layer.succeed(Terminal.columns, Effect.sync(() => process.stdout.columns ?? 80))`.
`readInput`, `readLine` and `size` share the `stdin`/`readline` setup that `make(shouldQuit)` does once today; that
setup becomes an internal scoped service, `NodeTerminal/Input` (a `Context.Service` whose layer owns the `readline`
interface and the keypress listener), and each of the three members is `Layer.effect(Terminal.readInput,
Effect.map(Input, …))` provided with it. A root that only displays never imports `Input`, so neither `readline` nor the
key-event parser is in its bundle, which is what the prototype's `main-terminal.ts` measures (two of six members).
`NodeTerminal.layer` keeps its form, a record layer, with `Input` provided inside; `NodeTerminal.make(shouldQuit)`
keeps its signature as the aggregate builder. The prototype's `src/Terminal.ts` and `src/node/terminal/` are this
layout.

**Phase 3, `effect/FileSystem`.** The 57 `yield* FileSystem` sites inside `effect` move, one commit per module: sites
that use a few members call them (`ConfigProvider` directory reads, `Logger` file sinks, `cli` completions) and expose
the precise union, or annotate `FileSystem.ReadOnly` where they want one name; sites that read and stream files
(`HttpServerResponse.file`, `HttpStaticServer`) annotate `FileSystem.ReadOnly | "effect/FileSystem/stream"`; sites
that genuinely use many members, or hand the record to other code, keep `yield* FileSystem`. Each consumer ends up with
one named requirement that a user satisfies with `NodeFileSystem.layer` as before, or with the member layers it lists.

**Phase 3, `effect/Terminal`.** The ten `cli/Prompt.ts` sites read `columns`, `readInput` and `display`; the prompt
runner takes `Terminal.Shape` by parameter in three places and keeps doing so. Each prompt's requirement becomes
`"effect/Terminal/columns" | "effect/Terminal/readInput" | "effect/Terminal/display"`, or `Terminal.Interactive`, a
subset record over those three exported from `effect/Terminal`, so a CLI that never prompts carries no reader.

## F. Decisions, and why

The design went through nine rounds of review. What each settled, in the order an implementer meets it:

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
  today's names but member layers can never satisfy it.
- **No branded phase for unstable modules** (round 9). Rounds 7 and 8 shipped `FileSystem` and `Terminal` first under
  their old identity, each operation branded with it (`"effect/FileSystem/readFile" & FileSystem` in every user's `R`
  for one release), with a `Brand` type argument on every constructor for that purpose. Both modules are `@stability
  unstable`, whose policy allows a breaking minor, so round 9 ships the identity change directly with the codemod and
  `ReadOnly`, and removes `Brand`: nothing used it, and a stable module's migration, if one ever happens, adds it back
  in one line.
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
  check per overlay, so the write is O(members) and the context is never copied. Round 9 kept that and gave the
  record overlay the ordinary overlay's shape (the record key as its `key`, the slots as its `value`), so an ordinary
  `add` allocates what it did at the branch point and the check in `lookup` is a `typeof` on a value it already holds.
  What survives is the least of each: the key knows its slots, the context knows nothing but that an overlay's key may
  be a record, the record's slot is checked against the members on the first read of each storage and the result is
  remembered.
- **A view has every member as an own property** (round 9). Round 8's view inherited the members it did not override
  and carried the override alone, one small object per read; it broke every spread decorator
  (`Effect.updateService(FileSystem, (fs) => ({ ...fs, x }))` produced a record missing every other member), threw a
  `TypeError` from a class with private fields once another member was overridden, and could not be remembered without
  costing more than it saved. A view is now a copy of the record's template with every member set, a plain object for a
  plain record and an object inheriting from a provided class instance otherwise (its methods own and bound to the
  instance, so private fields work), built once per storage from the slots or incrementally from the record beneath an
  override. `Object.create(provided)` and `Object.setPrototypeOf` were measured and rejected for plain records: the
  first leaves the view in dictionary mode (every property read a hash lookup), the second costs a microsecond per
  view; a copy of a fixed template is fast-mode and costs 120 ns for thirty-two members.
- **Assembly is incremental over member overlays and remembered per storage otherwise** (round 9). The record as seen
  from an overlay holding one plain member is the record as seen from the overlay below with that member replaced,
  so an override per request copies the record once instead of reading every member; the copy is kept in the key's
  one-entry cache and not in the `WeakMap`, since an entry per request lives until the next collection and showed up
  as 10× the ordinary cost under garbage-collector pressure where the copy alone is 2.6×. Views built from the slots (a
  flat map, a record never provided whole, a foreign record overlay) are remembered per storage in the `WeakMap`; they
  are built once per storage, not per request.
- **A record provided without a member is a defect at the write** (round 9), naming the member's key, rather than a
  record that reads back a member no call can use. Two tests in the repository that provided `{} as any` as the file
  system now provide `FileSystem.makeNoop({})`.
- **A method found on a provided object's prototype is stored bound to the object** (round 8), once per object and
  method, so that a class-based implementation works standalone as it does through the record, and a record written
  twice stores the same functions. With every member an own property of a view (round 9), the standalone and
  through-the-record forms agree in every case, including a sibling call through `this`, which reads the instance's
  member in both.
- **A record service reads itself** (round 9): `yield*`, `use` and `useSync` on a record key call its `read` directly
  instead of passing through `Context.get`, so the fiber path for a record is one method on one prototype and the
  getters' dispatch is reached only by `Context.get` and `Effect.service` on a record.
- **No defaults.** Every reason the overridable design was set aside is a reason not to add a defaulted variant;
  `Context.Reference` remains for values that want one, and may be a member.
- **The cost gate counts first and times second** (round 8), **in three orders, primed, with a twin** (round 9).
  Earlier gates took ratios of separately run medians, then wall-clock paired ratios with fixed limits that failed on a
  loaded runner without a regression in the code, then CPU-time paired ratios with an A/A control that exited 1 when
  the control was noisy, which on a loaded runner it usually was. The counts (`Map` and `WeakMap` operations, bytes per
  call) do not depend on the machine and are the gate; the timing runs report, widen their limits by the control's
  envelope, retry once with more rounds, and report SKIPPED rather than fail when the machine cannot be read; the
  runner runs every mode whatever the previous one reported. Round 9 found the same two closures reading 1.32× in one
  order of the pairs and 1.06× in another, with tight controls, and that the ordinary rows of the records process
  measure the cost of serving the runtime rather than a difference between the codes (under "The ordinary rows in the
  records process"); so every case is primed before calibration, each mode runs in three orders and is gated on the
  median, the branch-point rows are gated where both modules serve the same calls and reported beside a pristine twin
  of this branch where they do not, and the counts remain the gate that cannot be argued with.
- **The bundle gate is on the minified bundle** (round 9), the form a bundle ships in, with the number as esbuild
  prints it reported beside it. Round 8 gated the printed form and had widened the limit from 512 bytes to 1 kB to
  fit 837; this round prints 636 and ships 390, and the gate is 512 bytes minified.

## G. Alternatives rejected within this design

- **A `members` helper** that builds the operations from a table of names and kinds. Removes the key strings and the
  member list from a contract, and keeps every key and the Stream wrapper in every bundle that uses one; measured
  under "What a kept key costs". The recipe under "The library recipe" is the floor.
- **Storing the record only under its own key, with members reading through it.** Would let `Layer.succeed(FileSystem,
  record)` write one slot, but a member read would walk every record spanning it and a member provided outside a
  record would lose to it: the precedence bug of slices.
- **Writing a record as a fresh flat map** (round 7) instead of one overlay. Correct and simple, but every
  `Effect.provideService(FileSystem, impl)` copied the context's map: 3.6 µs at 33 slots, 27 µs at 300. The overlay
  costs `lookup` one `typeof` per overlay walked, which the ordinary timing rows and the counts measure.
- **Member slots as thirty-two separate overlays.** Every ordinary read through such a context would walk thirty-two
  overlays before reaching its slot, and `maxDepth` would flatten the chain at once; one overlay holding the members by
  position is the same write cost with one comparison for the walk.
- **A view with the overriding members only** (round 8), inheriting the rest from the provided object. One small
  object per read, and wrong under every operation that enumerates own properties: spread, `Object.keys`,
  `JSON.stringify`, `Effect.updateService` with a spread, `Layer.effect` over `yield* FileSystem`; and a `TypeError`
  from a class with private fields. Replaced by a view with every member its own.
- **A `Proxy` as the view**, with `ownKeys` and `getOwnPropertyDescriptor` traps listing every member and a `get` trap
  returning bound methods. Cheap to create and correct under reflection, but every property read through it is a trap,
  a method called on it with the proxy as `this` still cannot read a private field unless the trap binds it, and a
  `Proxy` is one more kind of object a user's record can turn into. A copy with every member its own is a plain object.
- **Remembering every view in the `WeakMap`**, incremental views included. An entry per new override lives until the
  next collection; under the per-request pattern the collector's work on the growing table made the view 10× an
  ordinary read where the copy alone is 2.6×. The one-entry cache keeps the common case (a context read repeatedly)
  free and leaves nothing behind.
- **Rebuilding the record on every member write** (round 6) instead of checking on read. Keeps the record read at
  one lookup with no overlay scan, at the price of a flat copy and a thirty-member rebuild on every override, a
  per-context index of records, and a record read that was not the provided object after any override.
- **Class-style operations** (`class ReadFile extends Context.Operation<…>()("…") {}`). A class cannot be called
  without `new`.
- **An identifier type parameter for operations** (`Operation<Self, Shape>`). Two operations with the same shape
  would alias in `R` unless each carried a brand; the key string is already unique and already nominal, and it prints
  better in errors.
- **A `read` method on every key's prototype as the getters' dispatch.** A key built structurally (`{ key }`), which
  the spec keeps working, has no prototype of ours, so the getter would still test for the method before calling it, and
  the method call is a second polymorphic property load on every read where the `typeof` costs none.
- **Gating the ordinary rows of the records process at 1.25 against the branch point.** The rows measure the live
  module against an idle copy; a pristine copy of this branch's own code fails that comparison by the same margin
  (under "The ordinary rows in the records process"). The rows are reported, the twin rows beside them, and the gate
  for the ordinary path is the ordinary process and the counts.
- **The key in the wrong-kind message** (`The shape of "test/stream" returns a Stream…`). TypeScript infers the key
  literal only from a branch of `KeyFor` that is the type parameter itself; a message built from it printed `${string}`
  in the key's place, so the message names the constructor to use and not the key.
