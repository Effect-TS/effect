# Tree-shakeable services: appendix

The evidence behind [the spec](../tree-shakeable-services.md), the later migration phases in detail, and the record of
the decisions that shaped the design. Every table here is the output of a command on this branch, named above it, run
on the commit whose `packages/` tree is the one reviewed; nothing in this file is normative.

## A. Cost

### Method

Three measurements, run in order by `pnpm --filter tree-shakeable-services-spec bench:check`
(`specs/tree-shakeable-services/scripts/bench-check.ts`), each against the `Context.ts` of the branch point
(`git merge-base HEAD origin/v4/next-minor`, `a2b1be040d`), loaded beside this branch's in the same process so both run
against the same `effect` runtime:

1. **Counts** (`packages/effect/benchmark/context/counts.ts --check`). `Map.prototype.get`, `has` and `set`,
   `Set.prototype.has`, and `WeakMap.prototype.get` and `set`, are replaced by counting wrappers for the duration of
   one call, after a warm-up call and, for operations with a per-storage cache, after the first call so that the
   steady state is counted. A `Map` copied with `new Map(map)` calls the replaced `set` once per entry, so a copy of a
   context's map counts as its size. Bytes are the growth of the heap over four thousand calls whose results are kept,
   after a full collection and with none in between (a run in which one happens is discarded), per call, after a
   hundred thousand warm-up calls so the code is optimized; the smallest of five runs, rounded to eight bytes. Counts
   do not depend on the machine's load. This is the gate a continuous integration runner applies.
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
every path. Both modules are warmed with the same key shapes and with references read while absent; in the records
mode this branch's getters are also warmed with a record key, since they will meet one, and a pristine copy of this
branch's own `Context.ts` (the twin) is loaded to serve the benchmark's calls alone. Absolute costs are reported and
not gated.

**Three orders.** The same two closures, in the same process, can differ by a few nanoseconds depending on the order
in which the cases were calibrated, optimised and laid out, with the A/A control none the wiser. So the runner
measures each timing mode in three processes with the pairs in three orders (`BENCH_SEED=0,1,2`) and gates the median
of the readable runs' medians, with the limits widened by the largest envelope of the readable runs; a mode whose
three controls are all too noisy is SKIPPED.

**What is gated where.** The rows that compare this branch with itself (a record read against an ordinary read, a
record write against an ordinary write, `yield*` of a record against `yield*` of a plain service) are gated in both
modes. The rows that compare this branch with the branch point are gated at 1.05 in the ordinary-keys mode, where
both modules serve the same calls and nothing else, and at 1.25 in the records mode, where this branch's module serves
the whole runtime (every reference the fibers read, every operation and record) while the copy of the branch point
serves the benchmark alone; the twin rows beside them measure that asymmetry with the code held equal, and are
reported. The reasoning and the readings are under "The ordinary rows in the records process".

The run pasted below is the whole gate on a shared eight-core machine. Two orders of the ordinary mode (controls 0.14
and 0.13 after their retries) and one of the records mode (0.07) were too noisy to read and are SKIPPED by the gate's
own rule; the readable orders are what is pasted.

### Counts

```
$ node benchmark/context/counts.ts --check
baseline: a2b1be040d; operations and bytes per call

ordinary keys, this branch over the branch point (each pair must be identical)

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
  mergeAll, 33 one-slot contexts, this branch                                             0        0       33        0         0         0    3040
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
  add member override then getUnsafe record, per request (new override each time)         1        0        0        1         2         0     312
  getUnsafe, record never written, first read of a storage                                1        0        0        1         2         0     312
  getUnsafe, record never written, later read                                             0        0        0        0         0         0       0

OK: every count is as stated
```

Readings. Every ordinary-key operation performs the same `Map` and `Set` operations and allocates the same bytes on
this branch as at the branch point: the ordinary path is the branch point's code. (The `mergeAll` bytes differ between
the two module instances in every run, on this branch and at the branch point alike, and are reported, not gated: the
heap growth of a `Map` of that size is what the allocator happens to reserve for it.) A record written into a context
performs no `Map` operation: one ordinary overlay per member and the object the read returns, remembered for the
topmost overlay with one `WeakMap.set`, 2,216 bytes in all, into 33 slots and into 300 alike. `make` of a record is 32
`Map.set`, one per slot of the fresh flat map. A member read through a record's overlays is found in the overlays, as
any overlay's slot is, with no `Map` operation. A record read is one `Set.has` per overlay walked above its storage
(the check that the overlay does not hold one of the record's slots) and then the remembered object, with nothing
allocated: none from the same flat context, one through a record's own overlays or one unrelated overlay, two with a
member overridden underneath and a per-request overlay above. A new override followed by a record read is one `Map.get`
(the member's name), one `Set.has`, two `WeakMap.get` (the override's storage, a miss, and the record below it) and one
copy of the record, 312 bytes with the overlay, and no `WeakMap.set`: the copy is kept in the key's one-entry cache
only.

### Timing, ordinary keys

The combined table, and the readable order in full:

```
=== timing, ordinary keys: the median of the 1 readable runs (orders 2)

  ratio (median over runs of the median per run)                                                    median                 runs   limit
  getUnsafe, ordinary key: this branch / baseline                                                     1.01                 1.01     1.10
  getUnsafe, mixed key kinds: this branch / baseline                                                  1.01                 1.01     1.10
  getUnsafe, reference default (slot absent): this branch / baseline                                  0.98                 0.98     1.10
  add, ordinary key to 33 slots: this branch / baseline                                               1.04                 1.04     1.10
  add, mixed key kinds: this branch / baseline                                                        0.93                 0.93     1.10
  add then getUnsafe, ordinary key: this branch / baseline                                            1.05                 1.05     1.10
  mergeAll, 33 one-slot contexts: this branch / baseline                                              0.99                 0.99     1.10

  largest control envelope: 0.05 (added to every limit)

OK: every median ratio is within its limit
```

```
=== timing, ordinary keys, order 2: BENCH_SEED=2 node operations.ts --ordinary

baseline: a2b1be040d; 21 rounds, each loop about 30 ms of CPU time, A/B/B/A within a round; ns/op; ordinary keys only (no record is held or read in this process)

  case                                                                            median       min       max
  control A: getUnsafe, ordinary key, this branch                                   18.1      11.7      45.5
  control B: getUnsafe, ordinary key, this branch                                   15.9      11.6      78.7
  getUnsafe, ordinary key, this branch                                              19.9      11.5      34.5
  getUnsafe, ordinary key, baseline                                                 20.0      11.3      48.9
  getUnsafe, reference default, this branch                                         22.1      13.5      57.3
  getUnsafe, reference default, baseline                                            22.5      13.2      57.3
  mergeAll, 33 contexts, this branch                                              2520.5    1473.2    3144.7
  mergeAll, 33 contexts, baseline                                                 2584.8    1501.8    3637.4
  add, ordinary key, this branch                                                    33.2      22.2      75.1
  add, ordinary key, baseline                                                       32.8      22.3      74.6
  add, mixed key kinds, this branch                                                 49.5      31.7      69.7
  add, mixed key kinds, baseline                                                    53.8      34.8      67.2
  getUnsafe, mixed key kinds, this branch                                           27.4      19.3      44.3
  getUnsafe, mixed key kinds, baseline                                              27.3      19.2      42.9
  add then getUnsafe, ordinary key, this branch                                     72.4      40.2      95.2
  add then getUnsafe, ordinary key, baseline                                        66.7      36.8     132.9

  ratio (median of per-round ratios)                                                                median     p25     p75   limit
  control, getUnsafe ordinary key: this branch / this branch                                          1.03    1.00    1.04     1.05
  getUnsafe, ordinary key: this branch / baseline                                                     1.01    0.98    1.04     1.10
  getUnsafe, reference default (slot absent): this branch / baseline                                  0.98    0.97    1.00     1.10
  mergeAll, 33 one-slot contexts: this branch / baseline                                              0.99    0.95    1.07     1.10
  add, ordinary key to 33 slots: this branch / baseline                                               1.04    0.97    1.07     1.10
  add, mixed key kinds: this branch / baseline                                                        0.93    0.90    1.01     1.10
  getUnsafe, mixed key kinds: this branch / baseline                                                  1.01    0.97    1.04     1.10
  add then getUnsafe, ordinary key: this branch / baseline                                            1.05    1.00    1.13     1.10

  control envelope: 0.05 (added to every limit)
```

Readings. The ordinary paths are the branch point's code behind one `typeof` of the key in `make`, `add` and the
getters: 1.00 to 1.05 against a limit of 1.05 plus the control's envelope. Round 9 read 1.12 to 1.21 on the flat read
in this mode, with the record overlay's branch in `lookup` and a `read` helper shared by every getter; both are gone.

### Timing, records

The combined table, and order 0 in full:

```
=== timing, records: the median of the 2 readable runs (orders 0, 2)

  ratio (median over runs of the median per run)                                                    median                 runs   limit
  getUnsafe, ordinary key: this branch / baseline                                                     1.07            1.10 1.07     1.30
  getUnsafe, mixed key kinds: this branch / baseline                                                  1.03            1.05 1.03     1.30
  getUnsafe, reference default (slot absent): this branch / baseline                                  1.04            1.06 1.04     1.30
  add, ordinary key to 33 slots: this branch / baseline                                               1.22            1.22 1.65     1.30
  add, mixed key kinds: this branch / baseline                                                        1.06            1.07 1.06     1.30
  add then getUnsafe, ordinary key: this branch / baseline                                            1.09            1.09 1.27     1.30
  mergeAll, 33 one-slot contexts: this branch / baseline                                              1.00            1.00 1.14     1.30
  getUnsafe, ordinary key: this branch / a pristine copy of this branch                               1.11            1.11 1.19 reported
  getUnsafe, reference default (slot absent): this branch / a pristine copy of this branch            1.03            1.03 1.07 reported
  add, ordinary key to 33 slots: this branch / a pristine copy of this branch                         1.08            1.28 1.08 reported
  add then getUnsafe, ordinary key: this branch / a pristine copy of this branch                      1.10            1.10 1.13 reported
  record read (provided whole) / ordinary key read, same context                                      0.74            0.75 0.74     1.30
  record read (provided whole) / ordinary key read, context rebuilt per request                       1.00            1.02 1.00     1.55
  record read (member overridden underneath) / ordinary key read, context rebuilt per request         1.11            1.26 1.11     1.55
  member override into a context holding the record / ordinary add                                    1.02            1.12 1.02     1.30
  member override then record read, per request / ordinary add then read                              3.24            3.54 3.24     5.05
  record assembled from 32 member layers, context rebuilt per request / ordinary add then read        1.00            1.00 1.04     1.55
  record write / ordinary write, into 33 slots                                                       39.75          39.75 43.77    64.05
  record write / ordinary write, into 300 slots                                                      37.21          37.21 47.50    64.05
  record write into 300 slots / into 33 slots                                                         0.96            0.96 1.00     1.20
  record write / mergeAll of 33 one-slot contexts                                                     1.00            1.02 1.00     1.30
  yield* FileSystem / yield* Plain, same context                                                      1.02            1.11 1.02     1.30
  yield* FileSystem / yield* Plain, context rebuilt per request                                       1.02            1.02 1.04     1.55
  yield* FileSystem, member overridden underneath / yield* Plain, context rebuilt per request         1.12            1.16 1.12     1.55
  yield* FileSystem, member overridden per request / yield* Plain, context rebuilt per request        1.22            1.28 1.22     3.05
  provideService(FileSystem) then yield* FileSystem / provideService(Plain) then yield* Plain, per request    3.61            3.70 3.61     5.05
  yield* FileSystem from member layers (assembled) / yield* Plain, context rebuilt per request        1.04            1.06 1.04     1.55
  operation call / method call on a yielded plain record                                              0.85            0.85 0.85     1.05
  method call on the record service / on a plain record                                               1.03            1.05 1.03     1.30

  largest control envelope: 0.05 (added to every limit)

OK: every median ratio is within its limit
```

```
=== timing, records, order 0: BENCH_SEED=0 node operations.ts 

baseline: a2b1be040d; 21 rounds, each loop about 30 ms of CPU time, A/B/B/A within a round; ns/op; records held and read in this process

  case                                                                            median       min       max
  control A: getUnsafe, ordinary key, this branch                                   13.7      12.4      88.5
  control B: getUnsafe, ordinary key, this branch                                   13.4      12.5      59.6
  getUnsafe, ordinary key, this branch                                              13.2      12.4      39.5
  getUnsafe, ordinary key, baseline                                                 12.6      11.7      24.2
  getUnsafe, mixed key kinds, this branch                                           21.9      19.9      37.5
  getUnsafe, mixed key kinds, baseline                                              20.7      19.3      36.9
  getUnsafe, reference default, this branch                                         17.0      15.1      32.2
  getUnsafe, reference default, baseline                                            15.5      14.1      52.7
  add, ordinary key, this branch                                                    38.2      33.2      65.7
  add, ordinary key, baseline                                                       30.8      28.7      54.8
  add, mixed key kinds, this branch                                                 41.7      36.5      64.3
  add, mixed key kinds, baseline                                                    37.8      34.0      57.0
  add then getUnsafe, ordinary key, this branch                                     41.6      36.4     184.1
  add then getUnsafe, ordinary key, baseline                                        38.0      35.2     137.1
  mergeAll, 33 contexts, this branch                                              1813.2    1668.3    3004.6
  mergeAll, 33 contexts, baseline                                                 1904.8    1675.0    3005.3
  getUnsafe, ordinary key, this branch (twin pair)                                  13.3      12.7      24.7
  getUnsafe, ordinary key, pristine copy of this branch                             12.0      11.4      32.0
  getUnsafe, reference default, this branch (twin pair)                             15.9      14.1      45.2
  getUnsafe, reference default, pristine copy of this branch                        15.5      13.4      32.1
  add, ordinary key, this branch (twin pair)                                        37.6      34.4      60.1
  add, ordinary key, pristine copy of this branch                                   29.0      26.9     122.9
  add then getUnsafe, ordinary key, this branch (twin pair)                         40.8      38.2      73.4
  add then getUnsafe, ordinary key, pristine copy of this branch                    36.3      34.1      83.4
  getUnsafe, record provided whole, same context                                     9.9       9.4      39.7
  getUnsafe, ordinary key (record context)                                          13.0      12.4      42.1
  add then getUnsafe, record provided whole                                         42.0      37.7     111.9
  add then getUnsafe, ordinary key (record pair)                                    41.8      37.9      80.3
  add then getUnsafe, record with a member overridden underneath                    49.6      42.6     114.1
  add then getUnsafe, ordinary key (override pair)                                  39.8      38.0      73.7
  add, member override to the record context                                        38.3      33.1      61.5
  add, ordinary key (override pair)                                                 33.9      32.0      49.4
  add member override then getUnsafe record, per request                           151.8     135.9     269.7
  add then getUnsafe, ordinary key (per-request override pair)                      43.5      37.5      67.1
  add then getUnsafe, record from 32 member layers (assembled)                      42.8      39.0      91.6
  add then getUnsafe, ordinary key (members pair)                                   43.7      37.7      73.5
  add, record (32 members) to 33 slots                                            1868.4    1472.0    3130.6
  add, ordinary key to 33 slots (write pair)                                        46.8      34.5     101.7
  add, record (32 members) to 300 slots                                           1904.7    1419.1    3558.2
  add, ordinary key to 300 slots                                                    48.1      33.4     101.3
  add, record (32 members) to 300 slots (size pair)                               2047.5    1636.5    3451.6
  add, record (32 members) to 33 slots (size pair)                                2098.3    1360.9    3497.8
  add, record (32 members) to 33 slots (merge pair)                               1805.2    1485.6    3625.4
  mergeAll, 33 contexts (merge pair)                                              1922.4    1665.5    3052.3
  runSync: yield* FileSystem (record service)                                      552.5     455.8    1097.8
  runSync: yield* Plain (today's record service)                                   481.9     428.9     988.2
  runSync: yield* FileSystem, context rebuilt per request                          660.5     625.3    1693.7
  runSync: yield* Plain, context rebuilt per request                               699.9     616.5    1295.1
  runSync: yield* FileSystem with a member overridden underneath, per request      754.9     672.5    1387.2
  runSync: yield* Plain, context rebuilt per request (override pair)               663.2     615.4    1265.5
  runSync: provideService(readFile) then yield* FileSystem                         879.0     771.8    1682.3
  runSync: yield* Plain, context rebuilt per request (per-request override pair)     663.9     618.4    1318.4
  runSync: provideService(FileSystem, record) then yield* FileSystem              2928.3    2429.4    4523.2
  runSync: provideService(Plain, record) then yield* Plain                         752.8     625.6    1328.7
  runSync: yield* FileSystem from member layers, per request                       723.5     636.0    1495.7
  runSync: yield* Plain, context rebuilt per request (members pair)                698.1     618.6    1436.9
  runSync: readFile(path) operation call                                           481.8     448.6     936.5
  runSync: (yield* Plain).readFile(path)                                           591.9     526.2    1117.4
  runSync: (yield* FileSystem).readFile(path)                                      589.5     541.7    1162.5
  runSync: (yield* Plain).readFile(path) (record pair)                             559.7     524.4    1110.8
  getUnsafe, operation key (1 of 33 slots)                                          14.7      13.9      30.0
  make, record (32 members)                                                       2611.2    1969.6    5066.3
  add, record (32 members): one overlay per member                                2176.1    1667.7    3046.7
  add a member override to a context holding the record (overlay)                   48.2      37.8      76.0
  first record read after a member override (one copy)                             154.5     138.3     323.6
  record read, never written, remembered per flat map                               46.0      39.4     131.7

  ratio (median of per-round ratios)                                                                median     p25     p75   limit
  control, getUnsafe ordinary key: this branch / this branch                                          1.02    0.99    1.04     1.05
  getUnsafe, ordinary key: this branch / baseline                                                     1.10    1.05    1.13     1.30
  getUnsafe, mixed key kinds: this branch / baseline                                                  1.05    1.03    1.14     1.30
  getUnsafe, reference default (slot absent): this branch / baseline                                  1.06    1.03    1.10     1.30
  add, ordinary key to 33 slots: this branch / baseline                                               1.22    1.18    1.28     1.30
  add, mixed key kinds: this branch / baseline                                                        1.07    1.04    1.13     1.30
  add then getUnsafe, ordinary key: this branch / baseline                                            1.09    1.05    1.16     1.30
  mergeAll, 33 one-slot contexts: this branch / baseline                                              1.00    0.92    1.04     1.30
  getUnsafe, ordinary key: this branch / a pristine copy of this branch                               1.11    1.08    1.18 reported
  getUnsafe, reference default (slot absent): this branch / a pristine copy of this branch            1.03    0.99    1.09 reported
  add, ordinary key to 33 slots: this branch / a pristine copy of this branch                         1.28    1.20    1.34 reported
  add then getUnsafe, ordinary key: this branch / a pristine copy of this branch                      1.10    1.05    1.15 reported
  record read (provided whole) / ordinary key read, same context                                      0.75    0.72    0.77     1.30
  record read (provided whole) / ordinary key read, context rebuilt per request                       1.02    0.98    1.05     1.55
  record read (member overridden underneath) / ordinary key read, context rebuilt per request         1.26    1.15    1.32     1.55
  member override into a context holding the record / ordinary add                                    1.12    1.10    1.17     1.30
  member override then record read, per request / ordinary add then read                              3.54    3.24    3.66     5.05
  record assembled from 32 member layers, context rebuilt per request / ordinary add then read        1.00    0.98    1.05     1.55
  record write / ordinary write, into 33 slots                                                       39.75   35.72   47.27    64.05
  record write / ordinary write, into 300 slots                                                      37.21   34.15   42.72    64.05
  record write into 300 slots / into 33 slots                                                         0.96    0.94    1.02     1.20
  record write / mergeAll of 33 one-slot contexts                                                     1.02    0.91    1.06     1.30
  yield* FileSystem / yield* Plain, same context                                                      1.11    1.08    1.14     1.30
  yield* FileSystem / yield* Plain, context rebuilt per request                                       1.02    0.98    1.13     1.55
  yield* FileSystem, member overridden underneath / yield* Plain, context rebuilt per request         1.16    1.10    1.20     1.55
  yield* FileSystem, member overridden per request / yield* Plain, context rebuilt per request        1.28    1.23    1.40     3.05
  provideService(FileSystem) then yield* FileSystem / provideService(Plain) then yield* Plain, per request    3.70    3.31    4.02     5.05
  yield* FileSystem from member layers (assembled) / yield* Plain, context rebuilt per request        1.06    1.01    1.15     1.55
  operation call / method call on a yielded plain record                                              0.85    0.77    0.90     1.05
  method call on the record service / on a plain record                                               1.05    1.00    1.10     1.30

  control envelope: 0.05 (added to every limit)

  absolute (median ns, reported, not gated)                                                         median     p25     p75
  getUnsafe, operation key (1 of 33 slots)                                                              15      14      20
  make, record (32 members)                                                                           2611    2204    3184
  add, record (32 members): one overlay per member                                                    2176    1918    2556
  add a member override to a context holding the record (overlay)                                       48      43      61
  first record read after a member override (one copy)                                                 154     144     218
  record read, never written, remembered per flat map                                                   46      41      54
```

Readings, the record rows first. A record read from the same context is 0.74× an ordinary read: the key's one-entry
cache answers before any `Map` is touched. From a context rebuilt per request it is 1.00× (one `Set.has` for the
per-request overlay, then the remembered object), with a member overridden underneath 1.11×, and from thirty-two
member layers 1.00×. A new override followed by a record read is 3.2× an ordinary write followed by a read (the copy
of the record below it, kept in the one-entry cache only). A record write is 37 to 40 ordinary writes for 32 members,
into 33 slots and into 300 alike (0.96× between the sizes), one overlay per member plus the assembled object, and the
same cost as `mergeAll` of 33 one-slot contexts (1.00×), the branch point's way of providing 33 slots at once. In a
fiber, `yield*` of a record is 1.02× `yield*` of a plain record service from the same context and from a context
rebuilt per request, 1.12× with a member overridden underneath, 1.22× with the override per request, 1.04× from member
layers, and 3.6× when the whole record is provided per request (its write per request); an operation call is 0.85× a
method call on a yielded plain record, and a method call on a record read is 1.03× one on a plain record. The absolute
costs: a record write of 32 members is about 1.9 µs as an overlay chain and 2.2 µs as a flat map; a first read after an
override about 120 ns; a record read remembered per flat map about 50 ns.

The ordinary rows in this process read 1.03 to 1.22 against the branch point, with the twin rows (identical code,
serving the benchmark alone) at 1.03 to 1.11 beside them; the next section is about those.

### The ordinary rows in the records process

In the ordinary process, where both modules serve the same calls, the ordinary rows are at parity (1.00 to 1.05). In
the records process they read 1.03 to 1.22, and the same rows against a pristine copy of this branch's own `Context.ts`
read 1.03 to 1.11 in the same run: identical code, one copy serving the fibers' reads of every reference, operation
and record the program uses and compiled for all of them, the other serving four shapes from the benchmark. Round 9's
gap in this process was 1.42 on the flat read, of which the twin explained 1.27; the rest was the record overlay's
branch in `lookup` and the getters' shared `read` helper, which loaded `key.key` at one site for every kind of key.
Round 10 removed both, and the experiment that settled whether the remaining `typeof` costs anything: with the record
dispatch moved to the miss path of `getUnsafe` (no `typeof` on the hit path at all) the flat read measured 1.05 and
1.05 in two orders, and with the `typeof` 0.96 and 0.97 in the same two orders, in a process holding records but with
the record-reading cases filtered out. The `typeof` is not what the records process pays; serving the runtime is, and
the branch point's `Context.ts` would pay it in the live role, where it cannot be put since the runtime is bound to
this branch's.

Consequences for the gate: the ordinary rows against the branch point are gated at 1.05 in the ordinary process, where
both modules are in the same role, and bounded at 1.25 in the records process with the twin rows reported beside
them; the counts gate, which does not depend on code layout or load, is identical for every ordinary row.

### Summary of the run

```
=== summary

  counts (load-insensitive gate)           OK
  timing, ordinary keys                    OK
  timing, records                          OK

the cost gate holds: every mode is OK or SKIPPED (unreadable machine)
```

## B. Tree-shaking

### What a kept key costs

A contract's declarations are calls (`Context.Operation<…>()("…")`, `Context.Operations(…)`), a provider's are calls
(`Layer.succeed(key, impl)`, `Layer.mergeAll(…)`), and a bundler keeps a top-level call it cannot prove pure. With a
contract in one module and a provider in one module, that is the whole question of tree-shaking: an unused export is
dropped when its initializer is pure, and kept, with everything it references, when it is not. The bundle check's
annotation matrix measures the two-operation root with the contract, the provider, or both as written, with
`/* @__PURE__ */` added by hand to each top-level declaration, and with `babel-plugin-annotate-pure-calls` run over the
module as publishing it does, under esbuild and Rolldown, with `effect` itself bundled as it is published:

| Root (`main.ts`, two operations)                          |     Size | Implementations kept | Keys kept           | Record | Stream code |
| --------------------------------------------------------- | -------: | -------------------- | ------------------- | ------ | ----------: |
| both published, esbuild (the default row)                 |  87.3 kB | readFile, writeFile  | readFile, writeFile | absent |         0 B |
| contract as written, esbuild                              |  98.5 kB | readFile, writeFile  | all 30              | kept   |      1456 B |
| provider as written, esbuild                              | 101.5 kB | all 30               | all 30              | absent |      3092 B |
| provider annotated `@__PURE__`, esbuild                   |  87.3 kB | readFile, writeFile  | readFile, writeFile | absent |         0 B |
| both annotated `@__PURE__`, esbuild                       |  87.2 kB | readFile, writeFile  | readFile, writeFile | absent |         0 B |
| both as written, Rolldown                                 | 101.8 kB | all 30               | all 30              | kept   |      3148 B |
| both annotated `@__PURE__`, Rolldown                      |  78.3 kB | readFile, writeFile  | readFile, writeFile | absent |         0 B |
| both published, Rolldown                                  |  76.1 kB | readFile, writeFile  | readFile, writeFile | absent |         0 B |
| both as written, `effect` from source, esbuild            | 447.0 kB | all 30               | all 30              | kept   |    104.6 kB |
| both annotated `@__PURE__`, `effect` from source, esbuild | 232.2 kB | readFile, writeFile  | readFile, writeFile | absent |         0 B |

What the rows establish:

- **An unannotated provider keeps every implementation.** `export const chmod = Layer.succeed(…)` is a call at the top
  level of a module the root imports; nothing marks it pure, so esbuild and Rolldown keep it, and `layer`, which
  references all thirty, with it: 6.7 kB of `NodeFileSystem.ts` instead of 521 bytes, and the Stream runtime for the
  three Stream implementations. The annotation, by the build or by hand, removes all of it (rows four and five equal
  the first). This is the one requirement the design places on a provider module, and it is not a layout
  requirement: rounds 1 to 10 met it by putting each layer in a file of its own, which a bundler drops whole under
  `sideEffects: false` without reading the call; one module per provider meets it with the annotation every
  published package already carries.
- **An unannotated contract costs about 11 kB: the thirty keys, the two record declarations and a 1.4 kB wrapper.** The
  wrapper is `Stream.Operation`, `streamCall` and the `Stream.unwrap` they close over, kept because the three Stream
  keys are kept; it is not the Stream runtime, which in a published `effect` is itself tree-shaken function by function
  (the one-Stream-operation root carries 3.8 kB of it). The records (`FileSystem`, `ReadOnly`) are kept for the same
  reason the keys are: their declarations are calls in the one contract module. Rounds 1 to 10 kept the record in a
  module of its own and this row did not carry it; the 7 kB difference is what a record declaration and the
  `Operations` constructor cost when nothing drops them. Nothing in the program's behaviour changes, so no rule is
  needed for shaking to work; the cost is gone once published.
- **Published modules shake without user action.** `packages/effect`'s build, and every platform package's, runs
  `babel-plugin-annotate-pure-calls` over `dist`, which annotates the outer call of every top-level declaration,
  curried or not, and esbuild drops the whole expression. This is how every `Context.Service("…")` key and every
  `Layer` in `effect` shakes today, and `effect/FileSystem`'s operations and a provider's operation layers shake the
  same way with no annotation in the source, which the bundle test in `packages/effect` checks against the real
  contract module and a one-module provider fixture.
- **Bundling `effect` from source is a different measurement.** The last two rows are the repository's own layout:
  `packages/effect/src/*.ts` has no annotations, so once a module is imported its whole body is kept, and importing
  anything from `Stream.ts` costs 105 kB. That is a property of unannotated module bodies, not of the design, and it
  is the same for any `Stream` import today. The matrix keeps the two rows so the difference is on record.

### The prototype's bundle check

```
$ pnpm --filter tree-shakeable-services-spec bundle
Bundle sizes (esm, unminified; effect and the prototype's library modules as published unless noted)
  main.ts (two operation layers, imported by name)                             87.3 kB
  main-namespace.ts (two operation layers, read off the namespace)             87.3 kB
  main-readonly.ts (ReadOnly subset, three member layers)                      87.7 kB
  main-stream.ts (one Stream operation)                                        94.4 kB
  main-twenty.ts (twenty operation layers)                                     93.4 kB
  main-record.ts (yield* FileSystem, NodeFileSystem.layer)                    109.1 kB
  main-full.ts (two operations, NodeFileSystem.layer)                         101.6 kB
  main-terminal.ts (two terminal layers)                                       86.4 kB
  main-plain.ts (no record, no operation)                                      84.5 kB
  main-plain.ts (no record, no operation, branch point Context.ts)             84.1 kB
  main.ts (contract as written, esbuild)                                       98.5 kB
  main.ts (provider as written, esbuild)                                      101.5 kB
  main.ts (provider annotated @__PURE__, esbuild)                              87.3 kB
  main.ts (both annotated @__PURE__, esbuild)                                  87.2 kB
  main.ts (both as written, rolldown)                                         101.8 kB
  main.ts (both annotated @__PURE__, rolldown)                                 78.3 kB
  main.ts (both published, rolldown)                                           76.1 kB
  main.ts (both as written, effect from source, esbuild)                      447.0 kB
  main.ts (both annotated @__PURE__, effect from source, esbuild)             232.2 kB
Implementation markers in each bundle (all thirty are exports of src/NodeFileSystem.ts)
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
  main.ts                                                            521 B of NodeFileSystem.ts   2 of 30 implementations: readFile, writeFile
  main-namespace.ts                                                  521 B of NodeFileSystem.ts   2 of 30 implementations: readFile, writeFile
  main-readonly.ts                                                   875 B of NodeFileSystem.ts   3 of 30 implementations: exists, readFile, stat
  main-stream.ts                                                     340 B of NodeFileSystem.ts   1 of 30 implementations: stream
  main-twenty.ts                                                     3933 B of NodeFileSystem.ts  20 of 30 implementations: access, copy, copyFile, exists, lstat, makeDirectory, makeTempDirectory, readDirectory, readDirectoryEntries, readFile, readFileString, realPath, remove, rename, stat, symlink, truncate, utimes, writeFile, writeFileString
  main-record.ts                                                     6772 B of NodeFileSystem.ts  30 of 30 implementations: all
  main-full.ts                                                       6772 B of NodeFileSystem.ts  30 of 30 implementations: all
  main-terminal.ts                                                   0 B of NodeFileSystem.ts     0 of 30 implementations: none
  main-plain.ts                                                      0 B of NodeFileSystem.ts     0 of 30 implementations: none
  main-plain.ts [no record, no operation, branch point Context.ts]   0 B of NodeFileSystem.ts     0 of 30 implementations: none
  main.ts [contract as written, esbuild]                             523 B of NodeFileSystem.ts   2 of 30 implementations: readFile, writeFile
  main.ts [provider as written, esbuild]                             6654 B of NodeFileSystem.ts  30 of 30 implementations: all
  main.ts [provider annotated @__PURE__, esbuild]                    521 B of NodeFileSystem.ts   2 of 30 implementations: readFile, writeFile
  main.ts [both annotated @__PURE__, esbuild]                        521 B of NodeFileSystem.ts   2 of 30 implementations: readFile, writeFile
  main.ts [both as written, rolldown]                                10.5 kB of NodeFileSystem.ts 30 of 30 implementations: all
  main.ts [both annotated @__PURE__, rolldown]                       1926 B of NodeFileSystem.ts  2 of 30 implementations: readFile, writeFile
  main.ts [both published, rolldown]                                 493 B of NodeFileSystem.ts   2 of 30 implementations: readFile, writeFile
  main.ts [both as written, effect from source, esbuild]             6661 B of NodeFileSystem.ts  30 of 30 implementations: all
  main.ts [both annotated @__PURE__, effect from source, esbuild]    521 B of NodeFileSystem.ts   2 of 30 implementations: readFile, writeFile
Terminal implementations in each bundle (all six are exports of src/NodeTerminal.ts)
  main-terminal.ts                                                   334 B of NodeTerminal.ts     2 of 6: columns, display
Stream runtime bytes in each bundle (Stream.ts, Channel.ts, Sink.ts and their internals; wrapper = under 2 kB)
  main.ts                                                            28 effect modules          0 B  expected none
  main-namespace.ts                                                  28 effect modules          0 B  expected none
  main-readonly.ts                                                   28 effect modules          0 B  expected none
  main-stream.ts                                                     35 effect modules       3837 B  expected used (Stream.ts, Channel.ts, internal/stream.ts)
  main-twenty.ts                                                     28 effect modules          0 B  expected none
  main-record.ts                                                     32 effect modules       3092 B  expected used (Stream.ts, Channel.ts, internal/stream.ts)
  main-full.ts                                                       32 effect modules       3092 B  expected used (Stream.ts, Channel.ts, internal/stream.ts)
  main-terminal.ts                                                   28 effect modules          0 B  expected none
  main-plain.ts                                                      27 effect modules          0 B  expected none
  main-plain.ts [no record, no operation, branch point Context.ts]   27 effect modules          0 B  expected none
  main.ts [contract as written, esbuild]                             31 effect modules       1456 B  expected wrapper (Stream.ts, Channel.ts, internal/stream.ts)
  main.ts [provider as written, esbuild]                             32 effect modules       3092 B  expected used (Stream.ts, Channel.ts, internal/stream.ts)
  main.ts [provider annotated @__PURE__, esbuild]                    28 effect modules          0 B  expected none
  main.ts [both annotated @__PURE__, esbuild]                        28 effect modules          0 B  expected none
  main.ts [both as written, rolldown]                                32 effect modules       3148 B  expected used (Stream.ts, Channel.ts, internal/stream.ts)
  main.ts [both annotated @__PURE__, rolldown]                       28 effect modules          0 B  expected none
  main.ts [both published, rolldown]                                 28 effect modules          0 B  expected none
  main.ts [both as written, effect from source, esbuild]             77 effect modules     104.6 kB  expected used (Stream.ts, Channel.ts, Sink.ts, internal/stream.ts)
  main.ts [both annotated @__PURE__, effect from source, esbuild]    53 effect modules          0 B  expected none
What Context.ts costs a bundle with no record and no operation
                        as printed    minified
  this branch              84.5 kB     48.1 kB
  branch point             84.1 kB     47.8 kB
  difference                 408 B       275 B  limit 512 B minified
Contract constants the bundler kept in the two-operation bundle
  main.ts                                                            keys: readFile, writeFile; record service: absent
  main.ts [contract as written, esbuild]                             keys: all 30; record service: present
  main.ts [provider as written, esbuild]                             keys: all 30; record service: absent
  main.ts [provider annotated @__PURE__, esbuild]                    keys: readFile, writeFile; record service: absent
  main.ts [both annotated @__PURE__, esbuild]                        keys: readFile, writeFile; record service: absent
  main.ts [both as written, rolldown]                                keys: all 30; record service: present
  main.ts [both annotated @__PURE__, rolldown]                       keys: readFile, writeFile; record service: absent
  main.ts [both published, rolldown]                                 keys: readFile, writeFile; record service: absent
  main.ts [both as written, effect from source, esbuild]             keys: all 30; record service: present
  main.ts [both annotated @__PURE__, effect from source, esbuild]    keys: readFile, writeFile; record service: absent
  node dist/main.js <file>: backed up 6 bytes of <file>
  node dist/main-stream.js <file>: <file> has 6 bytes
  node dist/main-readonly.js <file>: <file> is 6 bytes
  node dist/main-terminal.js <file>: displayed at 80 columns
  node dist/main-plain.js <file>: hello, <file>
OK: every bundle contains exactly the implementations its program uses, read out of one provider module; Effect-only roots carry none of the Stream runtime; and the shaken bundles run
```

The no-record root carries 408 bytes of `Context.ts` over the branch point as esbuild prints it (indentation and line
breaks included) and 275 bytes minified, which is the form a bundle ships in and the one the check gates at 512 bytes:
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
typetest/errors/partial-record.ts(6,67): error TS2345: Argument of type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is not assignable to parameter of type 'Shape'.
  Type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is missing the following properties from type 'Shape<{ access: Operation<"effect/FileSystem/access", (path: string, options?: { readonly writable?: boolean; readonly readable?: boolean; } | undefined) => Effect<void, FileSystemError, never>>; chmod: Operation<"effect/FileSystem/chmod", (path: string, mode: number) => Effect<void, FileSystemError, never>>; [27 more members, elided here]; writeFileString: Operation<"effect/FileSystem/writeFileString", (path: string, data: string) => Effect<void, FileSystemError, never>>; }>': access, chmod, chown, copy, and 25 more.
typetest/errors/partial-subset.ts(6,59): error TS2345: Argument of type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is not assignable to parameter of type 'ReadOnlyShape'.
  Type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is missing the following properties from type 'Shape<{ exists: Operation<"effect/FileSystem/exists", (path: string) => Effect<boolean, FileSystemError, never>>; readFile: Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>; stat: Operation<"effect/FileSystem/stat", (path: string) => Effect<Info, FileSystemError, never>>; }>': exists, stat
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
typetest/errors/wrong-self.ts(19,5): error TS2345: Argument of type '"test/WrongShape"' is not assignable to parameter of type '"Shape is not the members' shape: declare it as interface Shape extends Context.Operations.Shape<typeof members> {}"'.
typetest/errors/wrong-self.ts(21,45): error TS2345: Argument of type '"test/Unknown"' is not assignable to parameter of type '"Give the record its identifier: Context.Operations<Self, Shape>()(key, members)"'.
typetest/errors/wrong-self.ts(23,42): error TS2554: Expected 0 arguments, but got 1.
OK: every file under typetest/errors fails to compile for the documented reason
```

Two of these are the facts under "Type-level evidence" in the spec: `record-requires-all.ts(8,19)` is the record
program run unprovided, which prints the record's name, and `record-requires-all.ts(11,3)` is the same program with
two of its thirty operations provided, which prints the twenty-eight remaining keys in full (`missing-twenty.ts(48,19)`
is the twenty-operation program with three left, which prints three). The positive assertions, 322 lines of
`typetest/ok/signatures.ts`, compile under `pnpm --filter tree-shakeable-services-spec check`; the repository's own
type tests are `packages/effect/typetest/Context.tst.ts` (13 tests) and `FileSystem.tst.ts` (3 tests), 110 assertions
under `tstyche`.

## D. Compile cost

`tsc --extendedDiagnostics` (the repository's TypeScript, `packages/effect/tsconfig.json`, `--noEmit`, no incremental
cache) at the branch point and on this branch, which carries `Context`, the FileSystem and Terminal migrations with
`ReadOnly`, and their tests:

| Metric         |    before |     after |  change |
| -------------- | --------: | --------: | ------: |
| Types          | 1,046,206 | 1,055,272 | +0.87 % |
| Instantiations | 3,801,554 | 3,835,967 | +0.91 % |

Round 9 measured +1.34 % and +2.06 % with the hand-written `Shape` interfaces and `ShapeDifference`; deriving the
shapes from the operations is cheaper. Check time is not a criterion.

## E. Phases 2 and 3 in detail

The spec states the phases in a paragraph; this is the layout an implementer builds.

**Phase 2, `effect/FileSystem`, Node.** In `packages/platform/node-shared/src/NodeFileSystem.ts`, the one module it
is today: beside each implementation function the module already has (`const readFile = …`), an exported layer for
its operation, `export const readFile = Layer.succeed(FileSystem.readFile, readFileImpl)` (`watch` is `Layer.effect`
over `serviceOption(WatchBackend)`), so that `import * as NodeFileSystem from
"@effect/platform-node-shared/NodeFileSystem"` and `NodeFileSystem.readFile` shake as the bundle test's one-module
fixture does. The derived operations (`exists`, `glob`, `readFileString`, `stream`, `sink`, `writeFileString`) are
platform-independent: `effect/FileSystem` ships each as a layer over the primitives it needs, for example
`layerReadFileString: Layer<"effect/FileSystem/readFileString", never, "effect/FileSystem/readFile">`, and the
platform's export for a derived operation is that layer provided with the platform's primitive. `NodeFileSystem.layer`
keeps its name, type, module and form, `Layer.effect(FileSystem, make({...}))` built from the same implementation
functions, which provides the record whole; being an unused pure binding in a root that imports two operations, it
costs that root nothing. The package build's `annotate-pure-calls` step is what makes the new exports droppable, as
it already makes `layer` droppable in a root that does not use it; the `(() => …)()` initializers the module uses for
its implementation functions are calls like any other and are annotated the same way. No file is added or split.
After this phase a program that calls two operations and provides `NodeFileSystem.readFile` and
`NodeFileSystem.writeFile` bundles two implementations; a program that still provides `NodeFileSystem.layer` behaves
as before. `DenoFileSystem.ts` gets the same exports; Bun re-exports Node's.

**Phase 2, `effect/Terminal`.** `NodeTerminal.ts`, one module as today, exports one layer per member. `columns`,
`rows` and `display` are one-liners over `process.stdout`: `Layer.succeed(Terminal.columns, Effect.sync(() =>
process.stdout.columns ?? 80))`. `readInput`, `readLine` and `size` share the `stdin`/`readline` setup that
`make(shouldQuit)` does once today; that setup becomes an internal scoped service, `Input` (a `Context.Service` in the
same module whose layer owns the `readline` interface and the keypress listener), and each of the three members is
`Layer.effect(Terminal.readInput, Effect.map(Input, …))` provided with it. A root that only displays never references
`Input`, so neither `readline` nor the key-event parser is in its bundle, which is what the prototype's
`main-terminal.ts` measures (two of six members, 334 bytes of `NodeTerminal.ts`). `NodeTerminal.layer` keeps its form,
a record layer, with `Input` provided inside; `NodeTerminal.make(shouldQuit)` keeps its signature as the aggregate
builder. The prototype's `src/Terminal.ts` and `src/NodeTerminal.ts` are this layout.

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

The design went through ten rounds of review. What each settled, in the order an implementer meets it:

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
- **The shape is derived from the operations** (round 10): `interface Shape extends Context.Operations.Shape<typeof
  members> {}`. Rounds 7 to 9 wrote the interface by hand and took each operation's shape from it (`Shape["readFile"]`),
  with a `ShapeDifference` type to keep the two in step; now each operation declares its shape once and the record
  derives the rest, so `ShapeDifference` and one declaration are gone. The price, measured and pasted in C: TypeScript
  reports an interface with no members of its own by its one base type when listing missing members, so a partial
  record's second line names `Shape<{ access: Operation<…>; … }>`, the member list, where a hand-written interface
  printed `Shape`. The first line, the parameter type, prints `Shape` in both. Two bases or a redeclared member would
  restore the name and were rejected as warts.
- **No branded phase for unstable modules** (round 9). Rounds 7 and 8 shipped `FileSystem` and `Terminal` first under
  their old identity, each operation branded with it, with a `Brand` type argument on every constructor for that
  purpose. Both modules are `@stability unstable`, whose policy allows a breaking minor, so round 9 ships the identity
  change directly with the codemod and `ReadOnly`, and removes `Brand`.
- **One module per contract, one module per provider; the member list is written out** (this revision, at Tim
  Smart's direction: "for something to be tree shakable it doesn't need to be in a separate file"). Rounds 1 to 10
  put the prototype's operations in a module of their own, imported as a namespace for the member list, and each
  implementation layer in a file of its own, so that a bundler dropped unused modules whole; the spec's phase 2
  split `NodeFileSystem` into thirty files the same way. The layout bought nothing the pure annotation does not: a
  one-module provider as published carries 521 bytes of its 6.7 kB in the two-operation root, the same two
  implementations the thirty-file layout carried (measured under "What a kept key costs"), and a thirty-file
  provider is a worse module to read, maintain and document. A `members` helper building the operations from a table
  of names and kinds would keep every key in every bundle and was rejected in round 8 for that reason; a namespace
  import keeps nothing a written list does not, and nothing now needs one.
- **The members are properties of the key** (round 10), so that the one-line form `Context.Operations("app/Users", {
  find })` gives `Users.find(id)`, in both forms. A member whose name is a property of every key is rejected on the
  key argument (`Operations.Reserved`) and a defect at construction. They sit on a prototype of the key's own: an
  object given thirty properties one by one by keyed stores falls into V8's dictionary mode, and the key's own
  properties are read on every record read (measured: a dictionary-mode key read 39 ns where a fast one reads 6).
- **A record is its members and nothing else** (round 10). Rounds 3 to 9 gave the record a slot of its own holding
  the provided object, returned it from a read while the members still agreed with it, and otherwise built a view:
  an equality check per read, views inheriting from class instances, a template, a bound-method cache, and string
  semantics for the record's own slot, each a seam (a class method calling a sibling through `this` skipped an
  override; `getOrUndefinedUnsafe` by the record's string returned the provided object after an override; the view
  was one rule over overlays and another over flat maps). Round 10 drops the slot and the rule: a record write is its
  members' slots, a record read is a plain object of the members, assembled the same way on every path, and
  `instanceof` and identity do not survive a read. `FileSystem` and `Terminal` are unstable and nothing in the
  repository relied on either.
- **A record write is one ordinary overlay per member** (round 10), counting as one addition toward `maxDepth`.
  Rounds 8 and 9 wrote one overlay whose key was the record and whose value the slots by position, which `lookup`
  read with one more check per overlay walked; the ordinary read paid 1.12 to 1.21× in a process holding no record
  and 1.42× in one holding records, because `lookup` and a shared `read` helper were compiled for both kinds of
  overlay and key. With per-member overlays the `Overlay` type, `lookup`, the flatten and `merge` are the branch
  point's code, the one `typeof` is in `make`, `add`, `pick`, `omit` and the getters, and each getter loads `key.key`
  at a site of its own: the ordinary rows read 0.99 to 1.06× in the ordinary process (A). The price is the write:
  about two ordinary writes per member (one overlay and one property of the assembled object each) where round 9's
  single overlay was about one.
- **The assembled object is remembered per storage, with the last one read in front** (rounds 9 and 10). The storage
  is the topmost overlay holding one of the record's slots, or the base map; overlays above it hold other slots and
  cannot change the result, so contexts derived by unrelated writes share it. An object built by copying the record
  below an overlay holding one member (an override per request) is kept in the one-entry cache alone: round 9
  measured an entry per request in the `WeakMap` at 10× the ordinary cost under collector pressure where the copy
  alone is 2.6×, and round 10's first gate run saw the same row at 16× in one order with the entry and 2.9× without.
  Every object is copied from a per-record template (`Object.fromEntries` once per record) so that it has fast
  properties: an object given thirty properties one by one has not, and a member read through it would be a hash
  lookup.
- **A record provided without a member is a defect at the write** (round 9), naming the member's key, rather than a
  record that reads back a member no call can use.
- **A method found on a provided object's prototype is stored bound to the object** (round 8), at the write, so that
  a class-based implementation works standalone as it does through the record, private fields included. Round 9
  cached the bound functions per object so that a record written twice stored the same functions, for the identity
  check; round 10 has no identity check and binds once per write.
- **A record service reads itself** (round 9): `yield*`, `use` and `useSync` on a record key call its read directly
  instead of passing through `Context.get`, so the fiber path for a record is one method on one prototype.
- **No defaults.** Every reason the overridable design was set aside is a reason not to add a defaulted variant;
  `Context.Reference` remains for values that want one, and may be a member.
- **The cost gate counts first and times second** (round 8), **in three orders, primed** (round 9), **and gates the
  ordinary rows in both processes** (round 10). The counts (`Map`, `Set` and `WeakMap` operations, bytes per call) do
  not depend on the machine and are the gate; the timing runs report, widen their limits by the control's envelope,
  retry once with more rounds, and report SKIPPED rather than fail when the machine cannot be read. Round 10's
  ordinary rows are gated at 1.05 in the ordinary process and in the records process alike; in the latter this
  branch's getters are warmed with a record before anything is optimised, so that both modules are compiled for the
  shapes they will see, and the rows against a pristine twin of this branch's own code are reported beside them as the
  measure of what serving the runtime costs with the code held equal.
- **The bundle gate is on the minified bundle** (round 9), the form a bundle ships in. Round 10's no-record root is
  275 bytes over the branch point minified (390 in round 9), the `typeof` dispatch and nothing else.

## G. Alternatives rejected within this design

- **A `members` helper** that builds the operations from a table of names and kinds. Removes the key strings and the
  member list from a contract, and keeps every key and the Stream wrapper in every bundle that uses one; measured
  under "What a kept key costs". The recipe under "The contract recipe" is the floor.
- **A hand-written `Shape` interface** with the operations taking their shapes from it (rounds 7 to 9). Two
  declarations of every member's type, kept in step by a `ShapeDifference` check; the derived interface writes each
  once, at the cost of the second line of one diagnostic (F).
- **Storing the record only under its own key, with members reading through it.** Would let `Layer.succeed(FileSystem,
  record)` write one slot, but a member read would walk every record spanning it and a member provided outside a
  record would lose to it: the precedence bug of slices.
- **A slot of the record's own beside the members'** (rounds 3 to 9), holding the provided object so that a read could
  return it while the members agreed. The identity it bought cost an equality check per read, a second rule for
  views, a string that was sometimes a slot, and a bound-method cache; and the record's own `lookup` branch was the
  ordinary path's tax. Dropped in round 10.
- **One overlay holding every member by position** (rounds 8 and 9) instead of one per member. A cheaper write
  (one allocation) and a dearer everything else: `lookup` tested every overlay's kind, the flatten knew the record,
  and the getters shared one helper, compiled for both kinds of key. Per-member overlays are what the branch point
  already does for any slot; a chain of thirty-two is walked by a read of a slot below it, one comparison each, as
  every overlay is, and the branch point's flatten after enough base hits applies unchanged.
- **Writing a record as a fresh flat map** (round 7). Correct and simple, but every `Effect.provideService(FileSystem,
  impl)` copied the context's map: 3.6 µs at 33 slots, 27 µs at 300. Per-member overlays cost the same into either.
- **A view with the overriding members only** (round 8), inheriting the rest from the provided object. One small
  object per read, and wrong under every operation that enumerates own properties: spread, `Object.keys`,
  `JSON.stringify`, `Effect.updateService` with a spread, `Layer.effect` over `yield* FileSystem`; and a `TypeError`
  from a class with private fields.
- **A `Proxy` as the record read**, with traps listing every member and binding methods. Every property read through
  it is a trap, and a `Proxy` is one more kind of object a user's record can turn into. A plain object is a plain
  object.
- **Remembering every assembled object in the `WeakMap`**, copies over an override included. An entry per new
  override lives until the next collection; under the per-request pattern the collector's work on the growing table
  made the read 10× (round 9) and 16× in one order (round 10) where the copy alone is 3×.
- **Building the assembled object without a template.** `{}` plus thirty keyed stores is a dictionary-mode object
  (V8 normalises after twelve keyed additions), and so is a key given its members the same way: a member read through
  it is a hash lookup, and a record read through such a key took 39 ns where a fast one takes 6. `Object.fromEntries`
  per read costs 2.3 µs; a spread of a template built by it once costs 120 ns and is fast.
- **Dispatching record reads on the miss path of the getters** (round 10), so that the hit path has no `typeof` at
  all: `lookup(self, key.key)` first, and the record read only when the slot is absent. Measured at the same cost as
  the `typeof` (the typeof is not what the records process pays, A), and it makes the record's string a slot again: a
  `Context.Service` built with it would hide the members from `Context.get`, while `yield*` kept reading them.
- **Rebuilding the record on every member write** (round 6) instead of reading on demand. A flat copy and a
  thirty-member rebuild on every override, and a per-context index of records.
- **Class-style operations** (`class ReadFile extends Context.Operation<…>()("…") {}`). A class cannot be called
  without `new`.
- **An identifier type parameter for operations** (`Operation<Self, Shape>`). Two operations with the same shape
  would alias in `R` unless each carried a brand; the key string is already unique and already nominal.
- **A `read` method on every key's prototype as the getters' dispatch.** A key built structurally (`{ key }`), which
  the spec keeps working, has no prototype of ours, so the getter would still test for the method before calling it,
  and the method call is a polymorphic property load on every read where the `typeof` costs none.
- **The key in the wrong-kind message** (`The shape of "test/stream" returns a Stream…`). TypeScript infers the key
  literal only from a branch of `KeyFor` that is the type parameter itself; a message built from it printed `${string}`
  in the key's place, so the message names the constructor to use and not the key.
