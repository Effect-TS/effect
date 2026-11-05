/**
 * The contract of a file system: the module a consumer treats as the service.
 *
 * A program writes `FileSystem.readFile(path)` after `import * as FileSystem`,
 * and `FileSystem.FileSystem`, the record service, when it wants the whole
 * record. Everything here is a key; the implementations live in `./node/`.
 *
 * The recipe, in full: one operation per member, each with its shape
 * (`./FileSystem/operations.ts`), and below, the record service over the
 * operations module imported as a namespace, so the member list is the
 * module's export list and is never written by hand. `Shape`, the record of
 * implementations, is derived from the operations as an interface, and the
 * identity is a type alias of the union of their keys, so diagnostics print
 * `Shape` and `FileSystem` rather than thirty members or thirty keys.
 * `ReadOnly` is a record over three of the same members, with a shape of its
 * own derived the same way.
 */
import * as Context from "effect/Context"
import * as members from "./FileSystem/operations.ts"

export * from "./FileSystem/operations.ts"
export * from "./FileSystem/Shape.ts"

/**
 * The record of implementations, as `yield* FileSystem` returns it and as
 * `Layer.succeed(FileSystem, record)` takes it: the operations' shapes by name.
 * An interface, so that diagnostics print `Shape` and name the members it lacks.
 */
export interface Shape extends Context.Operations.Shape<typeof members> {}

/**
 * The identity of the file system: the union of its operations' keys, which is
 * what makes a merge of the thirty operation layers a `Layer<FileSystem>`.
 */
export type FileSystem = Context.Operations.Identifier<typeof members>

/**
 * The file system as one record service: an ordinary `Context.Service` that is
 * its members and nothing else. `Layer.succeed(FileSystem, record)` provides
 * all thirty operations, `yield* FileSystem` reads them back as one object,
 * and `Effect.provideService(readFile, fake)` on top of either replaces one of
 * them.
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
 * `Shape`, derived from the three operations and printed by its name.
 */
export interface ReadOnlyShape extends Context.Operations.Shape<typeof readOnlyMembers> {}

/**
 * The read-only file system as a record service.
 */
export const ReadOnly = Context.Operations<ReadOnly, ReadOnlyShape>()("effect/FileSystem/ReadOnly", readOnlyMembers)
