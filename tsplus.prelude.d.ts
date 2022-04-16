// =============================================================================
// @effect/core
// =============================================================================
/**
 * Ensure types are in scope
 */
import type {} from "@effect/core";
/**
 * @tsplus global
 */
import { Cause } from "@effect/core/io/Cause/definition";
/**
 * @tsplus global
 */
import {
  ChannelError,
  FiberFailure,
  IllegalArgumentException,
  IllegalStateException,
  InterruptedException,
  RuntimeError
} from "@effect/core/io/Cause/errors";
/**
 * @tsplus global
 */
import { Clock } from "@effect/core/io/Clock/definition";
/**
 * @tsplus global
 */
import { DefaultEnv } from "@effect/core/io/DefaultEnv/definition";
/**
 * @tsplus global
 */
import { Deferred } from "@effect/core/io/Deferred/definition";
/**
 * @tsplus global
 */
import { Effect } from "@effect/core/io/Effect/definition";
/**
 * @tsplus global
 */
import { FiberRefs } from "@effect/core/io/Effect/operations/fiberRefs";
/**
 * @tsplus global
 */
import { ExecutionStrategy } from "@effect/core/io/ExecutionStrategy/definition";
/**
 * @tsplus global
 */
import { Exit } from "@effect/core/io/Exit/definition";
/**
 * @tsplus global
 */
import { Fiber } from "@effect/core/io/Fiber/definition";
/**
 * @tsplus global
 */
import { FiberId } from "@effect/core/io/FiberId/definition";
/**
 * @tsplus global
 */
import { FiberRef } from "@effect/core/io/FiberRef/definition";
/**
 * @tsplus global
 */
import { FiberRefs } from "@effect/core/io/FiberRefs/definition";
/**
 * @tsplus global
 */
import { FiberScope } from "@effect/core/io/FiberScope/definition";
/**
 * @tsplus global
 */
import { Hub } from "@effect/core/io/Hub/definition";
/**
 * @tsplus global
 */
import { InterruptStatus } from "@effect/core/io/InterruptStatus/definition";
/**
 * @tsplus global
 */
import { Layer } from "@effect/core/io/Layer/definition";
/**
 * @tsplus global
 */
import { Logger } from "@effect/core/io/Logger/definition";
/**
 * @tsplus global
 */
import { LogLevel } from "@effect/core/io/LogLevel/definition";
/**
 * @tsplus global
 */
import { LogSpan } from "@effect/core/io/LogSpan/definition";
/**
 * @tsplus global
 */
import { MetricRegistry } from "@effect/core/io/Metrics/MetricRegistry";
/**
 * @tsplus global
 */
import { MetricPair } from "@effect/core/io/Metrics/MetricPair";
/**
 * @tsplus global
 */
import { MetricHook } from "@effect/core/io/Metrics/MetricHook";
/**
 * @tsplus global
 */
import { MetricHooks } from "@effect/core/io/Metrics/MetricHooks";
/**
 * @tsplus global
 */
import { Metric } from "@effect/core/io/Metrics/definition";
/**
 * @tsplus global
 */
import { MetricKey } from "@effect/core/io/Metrics/MetricKey";
/**
 * @tsplus global
 */
import { MetricLabel } from "@effect/core/io/Metrics/MetricLabel";
/**
 * @tsplus global
 */
import { MetricListener } from "@effect/core/io/Metrics/MetricListener";
/**
 * @tsplus global
 */
import { MetricState } from "@effect/core/io/Metrics/MetricState";
/**
 * @tsplus global
 */
import { MetricKeyType } from "@effect/core/io/Metrics/MetricKeyType";
/**
 * @tsplus global
 */
import { Dequeue } from "@effect/core/io/Queue/definition/Dequeue";
/**
 * @tsplus global
 */
import { Enqueue } from "@effect/core/io/Queue/definition/Enqueue";
/**
 * @tsplus global
 */
import { Queue } from "@effect/core/io/Queue/definition/Queue";
/**
 * @tsplus global
 */
import { Random } from "@effect/core/io/Random/definition";
/**
 * @tsplus global
 */
import { Ref } from "@effect/core/io/Ref/definition";
/**
 * @tsplus global
 */
import { SynchronizedRef } from "@effect/core/io/Ref/Synchronized/definition";
/**
 * @tsplus global
 */
import { Runtime } from "@effect/core/io/Runtime/definition";
/**
 * @tsplus global
 */
import { RuntimeConfig } from "@effect/core/io/RuntimeConfig/definition";
/**
 * @tsplus global
 */
import { RuntimeConfigFlag } from "@effect/core/io/RuntimeConfig/Flag";
/**
 * @tsplus global
 */
import { RuntimeConfigFlags } from "@effect/core/io/RuntimeConfig/Flags/definition";
/**
 * @tsplus global
 */
import { Schedule } from "@effect/core/io/Schedule/definition";
/**
 * @tsplus global
 */
import { Scope } from "@effect/core/io/Scope/definition";
/**
 * @tsplus global
 */
import { ReleaseMap } from "@effect/core/io/Scope/ReleaseMap/definition";
/**
 * @tsplus global
 */
import { Semaphore } from "@effect/core/io/Semaphore/definition";
/**
 * @tsplus global
 */
import { Supervisor } from "@effect/core/io/Supervisor/definition";
/**
 * @tsplus global
 */
import { Trace } from "@effect/core/io/Trace/definition";
/**
 * @tsplus global
 */
import { TraceElement } from "@effect/core/io/TraceElement/definition";
/**
 * @tsplus global
 */
import { Sync } from "@effect/core/io-light/Sync/definition";
/**
 * @tsplus global
 */
import { XPure } from "@effect/core/io-light/XPure/definition/base";
/**
 * @tsplus global
 */
import { STM, USTM } from "@effect/core/stm/STM/definition/base";
/**
 * @tsplus global
 */
import { TArray } from "@effect/core/stm/TArray/definition";
/**
 * @tsplus global
 */
import { TExit } from "@effect/core/stm/TExit/definition";
/**
 * @tsplus global
 */
import { TPriorityQueue } from "@effect/core/stm/TPriorityQueue/definition";
/**
 * @tsplus global
 */
import { TRef } from "@effect/core/stm/TRef/definition";
/**
 * @tsplus global
 */
import { TSemaphore } from "@effect/core/stm/TSemaphore/definition";
/**
 * @tsplus global
 */
import { Channel } from "@effect/core/stream/Channel/definition/base";
/**
 * @tsplus global
 */
import { GroupBy } from "@effect/core/stream/GroupBy/definition/base";
/**
 * @tsplus global
 */
import { Pull } from "@effect/core/stream/Pull/definition";
/**
 * @tsplus global
 */
import { Sink } from "@effect/core/stream/Sink/definition/base";
/**
 * @tsplus global
 */
import { SortedByKey } from "@effect/core/stream/SortedByKey/definition";
/**
 * @tsplus global
 */
import { Stream } from "@effect/core/stream/Stream/definition";
/**
 * @tsplus global
 */
import { SubscriptionRef } from "@effect/core/stream/SubscriptionRef/definition";
/**
 * @tsplus global
 */
import { Take } from "@effect/core/stream/Take/definition";
// =============================================================================
// @tsplus/stdlib
// =============================================================================
/**
 * Ensure types are in scope
 */
import type {} from "@tsplus/stdlib";
/**
 * @tsplus global
 */
import { Chunk } from "@tsplus/stdlib/collections/Chunk/definition";
/**
 * @tsplus global
 */
import { Collection } from "@tsplus/stdlib/collections/Collection/definition";
/**
 * @tsplus global
 */
import { HashMap } from "@tsplus/stdlib/collections/HashMap/definition";
/**
 * @tsplus global
 */
import { HashSet } from "@tsplus/stdlib/collections/HashSet/definition";
/**
 * @tsplus global
 */
import { ImmutableArray } from "@tsplus/stdlib/collections/ImmutableArray";
/**
 * @tsplus global
 */
import { ImmutableMap } from "@tsplus/stdlib/collections/ImmutableMap/definition";
/**
 * @tsplus global
 */
import { ImmutableQueue } from "@tsplus/stdlib/collections/ImmutableQueue/definition";
/**
 * @tsplus global
 */
import { List } from "@tsplus/stdlib/collections/List/definition";
/**
 * @tsplus global
 */
import { DoublyLinkedList } from "@tsplus/stdlib/collections/mutable/DoublyLinkedList";
/**
 * @tsplus global
 */
import { ListBuffer } from "@tsplus/stdlib/collections/mutable/ListBuffer";
/**
 * @tsplus global
 */
import { MutableHashMap } from "@tsplus/stdlib/collections/mutable/MutableHashMap/definition";
/**
 * @tsplus global
 */
import { MutableHashSet } from "@tsplus/stdlib/collections/mutable/MutableHashSet/definition";
/**
 * @tsplus global
 */
import { EmptyMutableQueue, MutableQueue } from "@tsplus/stdlib/collections/mutable/MutableQueue/definition";
/**
 * @tsplus global
 */
import { ParSeq } from "@tsplus/stdlib/collections/ParSeq/definition";
/**
 * @tsplus global
 */
import { RedBlackTree } from "@tsplus/stdlib/collections/RedBlackTree/definition";
/**
 * @tsplus global
 */
import { SortedMap } from "@tsplus/stdlib/collections/SortedMap/definition";
/**
 * @tsplus global
 */
import { SortedSet } from "@tsplus/stdlib/collections/SortedSet/definition";
/**
 * @tsplus global
 */
import { IterableWeakMap } from "@tsplus/stdlib/collections/weak/IterableWeakMap";
/**
 * @tsplus global
 */
import { AtomicBoolean } from "@tsplus/stdlib/data/AtomicBoolean";
/**
 * @tsplus global
 */
import { AtomicNumber } from "@tsplus/stdlib/data/AtomicNumber";
/**
 * @tsplus global
 */
import { AtomicReference } from "@tsplus/stdlib/data/AtomicReference";
/**
 * @tsplus global
 */
import { Duration } from "@tsplus/stdlib/data/Duration";
/**
 * @tsplus global
 */
import { Either } from "@tsplus/stdlib/data/Either/definition";
/**
 * @tsplus global
 */
import { identity, Lazy, LazyArg, pipe, Refinement, unsafeCoerce } from "@tsplus/stdlib/data/Function";
/**
 * @tsplus global
 */
import { LazyValue } from "@tsplus/stdlib/data/LazyValue";
/**
 * @tsplus global
 */
import { Match } from "@tsplus/stdlib/data/Match";
/**
 * @tsplus global
 */
import { Option } from "@tsplus/stdlib/data/Option/definition";
/**
 * @tsplus global
 */
import { Predicate } from "@tsplus/stdlib/data/Predicate";
/**
 * @tsplus global
 */
import { Env } from "@tsplus/stdlib/service/Env";
/**
 * @tsplus global
 */
import { Has } from "@tsplus/stdlib/service/Has";
/**
 * @tsplus global
 */
import { Service } from "@tsplus/stdlib/service/Service";
/**
 * @tsplus global
 */
import { Tag } from "@tsplus/stdlib/service/Tag";
/**
 * @tsplus global
 */
import { Stack } from "@tsplus/stdlib/data/Stack";
/**
 * @tsplus global
 */
import { Tuple } from "@tsplus/stdlib/data/Tuple/definition";
/**
 * @tsplus global
 */
import { IndexOutOfBounds, NoSuchElement } from "@tsplus/stdlib/exceptions";
/**
 * @tsplus global
 */
import { Exception } from "@tsplus/stdlib/exceptions/Exception";
/**
 * @tsplus global
 */
import { Eval } from "@tsplus/stdlib/io/Eval/definition";
/**
 * @tsplus global
 */
import { Associative } from "@tsplus/stdlib/prelude/Associative";
/**
 * @tsplus global
 */
import { AssociativeIdentity } from "@tsplus/stdlib/prelude/AssociativeIdentity";
/**
 * @tsplus global
 */
import { Closure } from "@tsplus/stdlib/prelude/Closure";
/**
 * @tsplus global
 */
import { Equivalence } from "@tsplus/stdlib/prelude/Equivalence/definition";
/**
 * @tsplus global
 */
import { instance } from "@tsplus/stdlib/prelude/Instance";
/**
 * @tsplus global
 */
import { Ord } from "@tsplus/stdlib/prelude/Ord/definition";
/**
 * @tsplus global
 */
import { Ordering } from "@tsplus/stdlib/prelude/Ordering/definition";
/**
 * @tsplus global
 */
import { Equals } from "@tsplus/stdlib/structure/Equals";
/**
 * @tsplus global
 */
import { Hash } from "@tsplus/stdlib/structure/Hash";
/**
 * @tsplus global
 */
import { isDefined, isIterable, isPlainObject, isPromiseLike, isReactElement } from "@tsplus/stdlib/utilities/Guards";
/**
 * @tsplus global
 */
import { lazy } from "@tsplus/stdlib/utilities/Lazy";
/**
 * @tsplus global
 */
import { RandomPCG } from "@tsplus/stdlib/utilities/RandomPCG";
/**
 * @tsplus global
 */
import {
  EnforceNonEmptyRecord,
  Erase,
  ESArray,
  ESIterable,
  ESReadonlyArray,
  ForcedArray,
  ForcedTuple,
  IsInt,
  MergeRecord,
  OrElse,
  PredicateWithIndex,
  RefinementWithIndex,
  Spreadable,
  UnionToIntersection
} from "@tsplus/stdlib/utilities/Types";
