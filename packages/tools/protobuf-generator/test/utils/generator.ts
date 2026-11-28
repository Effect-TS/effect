/**
 * Helpers for the generator tests: plugin requests from descriptor sets that
 * protoc or buf wrote, as they would send them to the plugin.
 */
import { assert } from "@effect/vitest"
import { ProtobufDescriptorProto, ProtobufMessage, type ProtobufPluginProto } from "effect/protobuf"
import * as Result from "effect/Result"
import { readFileSync } from "node:fs"

/** The files of a `FileDescriptorSet`, with their comments. */
export const readDescriptorSet = (url: URL): ReadonlyArray<ProtobufDescriptorProto.FileDescriptorProto> => {
  const set = Result.getOrThrow(ProtobufMessage.decode(ProtobufDescriptorProto.FileDescriptorSet)(readFileSync(url)))
  return (set as ProtobufDescriptorProto.FileDescriptorSet).file ?? []
}

/** The sample `.proto` files under `test/fixtures/protos`, built by `pnpm fixtures`. */
export const samples = readDescriptorSet(new URL("../fixtures/protos.binpb", import.meta.url))

/** The descriptor set of protoc 36.2 that `pnpm bootstrap` generates from. */
export const bootstrapSet = readDescriptorSet(
  new URL("../../../../effect/test/fixtures/protobuf/descriptor-set.binpb", import.meta.url)
)

/** The files of a successful response, by name. */
export const files = (response: ProtobufPluginProto.CodeGeneratorResponse): Record<string, string> => {
  assert.strictEqual(response.error, undefined)
  return Object.fromEntries((response.file ?? []).map((file) => [file.name ?? "", file.content ?? ""]))
}
