/**
 * The contract of a file system: the module a consumer treats as the service.
 *
 * A program writes `FileSystem.readFile(path)` after `import * as FileSystem`,
 * and `FileSystem.FileSystem`, the record service, when it wants the whole
 * record. Everything here is a key; the implementations live in `./node/`.
 *
 * The recipe, in full: the shape (`./FileSystem/Shape.ts`), one operation per
 * member (`./FileSystem/operations.ts`), and below, the record service over
 * the operations module imported as a namespace, so the member list is the
 * module's export list and is never written by hand. The identity is a type
 * alias of the union of the members' keys, so diagnostics print `FileSystem`
 * rather than thirty keys. `ReadOnly` is a record over three of the same
 * members, its shape a `Pick` of `Shape`.
 */
import * as Context from "effect/Context"
import * as members from "./FileSystem/operations.ts"
import type { Shape } from "./FileSystem/Shape.ts"

export * from "./FileSystem/operations.ts"
export * from "./FileSystem/Shape.ts"

/**
 * The identity of the file system: the union of its operations' keys, which is
 * what makes a merge of the thirty operation layers a `Layer<FileSystem>`.
 */
export type FileSystem = Context.Operations.Identifier<typeof members>

/**
 * The file system as one record service. It is an ordinary `Context.Service`
 * stored one slot per operation beside the record: `Layer.succeed(FileSystem,
 * record)` provides all thirty operations, `yield* FileSystem` reads the
 * record back, and `Effect.provideService(readFile, fake)` on top of either
 * replaces one of them.
 */
export const FileSystem = Context.Operations<FileSystem, Shape>()("effect/FileSystem", members)

const readOnlyMembers = { exists: members.exists, readFile: members.readFile, stat: members.stat }

/**
 * The read-only subset: a record service over three of the members above.
 * Nothing distinguishes it from `FileSystem` except which members it lists,
 * so a `Layer<FileSystem>` satisfies it, the three member layers merged
 * satisfy it, and it satisfies each of its members, all by plain
 * assignability. A reader annotates its requirement with this one name.
 */
export type ReadOnly = Context.Operations.Identifier<typeof readOnlyMembers>

/**
 * The record of a read-only file system's implementations: three members of
 * `Shape`. A `Pick` alias prints by its name in diagnostics.
 */
export type ReadOnlyShape = Pick<Shape, "exists" | "readFile" | "stat">

/**
 * The read-only file system as a record service.
 */
export const ReadOnly = Context.Operations<ReadOnly, ReadOnlyShape>()("effect/FileSystem/ReadOnly", readOnlyMembers)
