import { equals } from "effect/Equal"
import { pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as List from "effect/List"
import * as Option from "effect/Option"
import type * as PodAddress from "../PodAddress.js"
import * as ShardId from "../ShardId.js"
import * as PodWithMetadata from "./podWithMetadata.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface ShardManagerState {
  readonly pods: HashMap.HashMap<PodAddress.PodAddress, PodWithMetadata.PodWithMetadata>
  readonly shards: HashMap.HashMap<ShardId.ShardId, Option.Option<PodAddress.PodAddress>>
  readonly unassignedShards: HashSet.HashSet<ShardId.ShardId>
  readonly averageShardsPerPod: ShardId.ShardId
  readonly shardsPerPod: HashMap.HashMap<PodAddress.PodAddress, HashSet.HashSet<ShardId.ShardId>>
  readonly maxVersion: Option.Option<List.List<number>>
  readonly allPodsHaveMaxVersion: boolean
}

/**
 * @since 1.0.0
 * @category constructors
 */
export function make(
  pods: HashMap.HashMap<PodAddress.PodAddress, PodWithMetadata.PodWithMetadata>,
  shards: HashMap.HashMap<ShardId.ShardId, Option.Option<PodAddress.PodAddress>>
): ShardManagerState {
  const podVersions = pipe(
    HashMap.values(pods),
    List.fromIterable,
    List.map(PodWithMetadata.extractVersion)
  )
  const maxVersion = pipe(
    podVersions,
    List.reduce(List.empty<number>(), (curr, a) => PodWithMetadata.compareVersion(curr, a) === -1 ? a : curr),
    (result) => (List.size(result) === 0 ? Option.none() : Option.some(result))
  )
  const shardsPerPodPods = pipe(
    HashMap.reduce(
      shards,
      HashMap.empty<PodAddress.PodAddress, HashSet.HashSet<ShardId.ShardId>>(),
      (curr, optionPod, shardId) => {
        if (Option.isNone(optionPod)) return curr
        if (HashMap.has(curr, optionPod.value)) {
          return HashMap.modify(curr, optionPod.value, HashSet.add(shardId))
        } else {
          return HashMap.set(curr, optionPod.value, HashSet.fromIterable([shardId]))
        }
      }
    )
  )
  const shardsPerPod = pipe(
    HashMap.map(pods, () => HashSet.empty<ShardId.ShardId>()),
    HashMap.union(shardsPerPodPods)
  )

  const allPodsHaveMaxVersion = List.every(podVersions, (_) => equals(Option.some(_))(maxVersion))
  return {
    pods,
    shards,
    unassignedShards: pipe(
      HashMap.filter(shards, (a, _) => Option.isNone(a)),
      HashSet.fromIterable,
      HashSet.map(([k, _]) => k)
    ),
    averageShardsPerPod: pipe(
      HashMap.isEmpty(pods)
        ? ShardId.make(0)
        : ShardId.make(HashMap.size(shards) / HashMap.size(pods))
    ),
    shardsPerPod,
    maxVersion,
    allPodsHaveMaxVersion
  }
}
