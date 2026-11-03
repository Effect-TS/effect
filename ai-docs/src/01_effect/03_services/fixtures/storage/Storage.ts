// file: src/storage/Storage.ts
import { Context, type Effect, type Option, Schema } from "effect"

export class StorageError extends Schema.TaggedError<StorageError>()("StorageError", {
  cause: Schema.Defect()
}) {}

// The contract only. It carries no implementation, so importing it never pulls
// in the dependencies of any member.
export class Storage extends Context.Service<Storage, {
  get(key: string): Effect.Effect<Option.Option<string>, StorageError>
  put(key: string, value: string): Effect.Effect<void, StorageError>
  list(prefix: string): Effect.Effect<Array<string>, StorageError>
}>()("myapp/storage/Storage") {}
