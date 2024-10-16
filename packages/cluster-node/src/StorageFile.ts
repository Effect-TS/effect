/**
 * @since 1.0.0
 */
import * as Pod from "@effect/cluster/Pod"
import * as PodAddress from "@effect/cluster/PodAddress"
import * as ShardId from "@effect/cluster/ShardId"
import * as ShardingException from "@effect/cluster/ShardingException"
import * as Storage from "@effect/cluster/Storage"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as Layer from "effect/Layer"
import type * as Option from "effect/Option"
import * as ParseResult from "effect/ParseResult"
import * as Queue from "effect/Queue"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as fs from "node:fs"

/** @internal */
export function jsonStringify<A, I>(value: A, schema: Schema.Schema<A, I>) {
  return pipe(
    value,
    ParseResult.encode(schema),
    Effect.mapError((issue) =>
      new ShardingException.SerializationException({ error: ParseResult.TreeFormatter.formatIssue(issue) })
    ),
    Effect.map((_) => JSON.stringify(_))
  )
}

/** @internal */
export function jsonParse<A, I>(value: string, schema: Schema.Schema<A, I>) {
  return pipe(
    Effect.sync(() => JSON.parse(value)),
    Effect.flatMap(ParseResult.decode(schema)),
    Effect.mapError((issue) =>
      new ShardingException.SerializationException({ error: ParseResult.TreeFormatter.formatIssue(issue) })
    )
  )
}

const PODS_FILE = "pods.json"
const ASSIGNMENTS_FILE = "assignments.json"

const AssignmentsSchema = Schema.Array(
  Schema.Tuple(ShardId.schema, Schema.OptionFromNullOr(PodAddress.schema))
)

const PodsSchema = Schema.Array(Schema.Tuple(PodAddress.schema, Pod.schema))

function writeJsonData<A, I>(fileName: string, schema: Schema.Schema<A, I>, data: A) {
  return pipe(
    jsonStringify(data, schema),
    Effect.flatMap((data) => Effect.sync(() => fs.writeFileSync(fileName, data))),
    Effect.orDie
  )
}

function readJsonData<A, I>(fileName: string, schema: Schema.Schema<A, I>, empty: A) {
  return pipe(
    Effect.sync(() => fs.existsSync(fileName)),
    Effect.flatMap((exists) =>
      exists
        ? pipe(
          Effect.sync(() => fs.readFileSync(fileName)),
          Effect.flatMap((data) => jsonParse(data.toString(), schema))
        )
        : Effect.succeed(empty)
    ),
    Effect.orDie
  )
}

const getAssignments: Effect.Effect<HashMap.HashMap<ShardId.ShardId, Option.Option<PodAddress.PodAddress>>> = pipe(
  readJsonData(ASSIGNMENTS_FILE, AssignmentsSchema, []),
  Effect.map(HashMap.fromIterable)
)

function saveAssignments(
  assignments: HashMap.HashMap<ShardId.ShardId, Option.Option<PodAddress.PodAddress>>
): Effect.Effect<void> {
  return writeJsonData(ASSIGNMENTS_FILE, AssignmentsSchema, Array.from(assignments))
}

const getPods: Effect.Effect<HashMap.HashMap<PodAddress.PodAddress, Pod.Pod>> = pipe(
  readJsonData(PODS_FILE, PodsSchema, []),
  Effect.map(HashMap.fromIterable)
)

function savePods(
  pods: HashMap.HashMap<PodAddress.PodAddress, Pod.Pod>
): Effect.Effect<void> {
  return writeJsonData("pods.json", PodsSchema, Array.from(pods))
}

/**
 * A layer that stores data in-memory.
 * This is useful for testing with a single pod only.
 */

function getChangesStream(fileName: string) {
  return pipe(
    Queue.unbounded<boolean>(),
    Effect.flatMap((queue) =>
      pipe(
        Effect.acquireRelease(
          Effect.sync(
            () => [fs.watchFile(fileName, () => Effect.runSync(queue.offer(true))), queue] as const
          ),
          ([watcher, queue]) =>
            Effect.zip(
              queue.shutdown,
              Effect.sync(() => watcher.unref()),
              { concurrent: true }
            )
        ),
        Effect.map(([_, queue]) => Stream.fromQueue(queue))
      )
    ),
    Stream.unwrapScoped
  )
}

const assignmentsStream = pipe(
  getChangesStream(ASSIGNMENTS_FILE),
  Stream.mapEffect(() => getAssignments)
)

/**
 * @since 1.0.0
 * @category layers
 */
export const storageFile = Layer.scoped(
  Storage.Storage,
  Effect.succeed(Storage.make({
    getAssignments,
    saveAssignments,
    assignmentsStream,
    getPods,
    savePods
  }))
)
