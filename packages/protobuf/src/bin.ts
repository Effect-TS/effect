#!/usr/bin/env node
/**
 * `protoc-gen-effect`: a `protoc` / `buf` plugin generating Effect Schema
 * modules from `.proto` files. See `ProtoCodegen` for the output and the
 * plugin parameters.
 *
 * PROTOTYPE — see the package README.
 *
 * @since 4.0.0
 */
import * as Schema from "effect/Schema"
import { CodeGeneratorRequest, CodeGeneratorResponse } from "./Descriptor.ts"
import * as Protobuf from "./Protobuf.ts"
import * as ProtoCodegen from "./ProtoCodegen.ts"

// the package is compiled without Node.js types
declare const process: {
  readonly stdin: AsyncIterable<Uint8Array>
  readonly stdout: { write(chunk: Uint8Array): boolean }
}

const readStdin = async (): Promise<Uint8Array<ArrayBuffer>> => {
  const chunks: Array<Uint8Array> = []
  let length = 0
  for await (const chunk of process.stdin) {
    chunks.push(chunk)
    length += chunk.length
  }
  const out = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

const input = await readStdin()
let response: CodeGeneratorResponse
try {
  response = ProtoCodegen.generate(Schema.decodeSync(Protobuf.toCodec(CodeGeneratorRequest))(input))
} catch (e) {
  response = { error: `protoc-gen-effect: ${e instanceof Error ? e.message : String(e)}`, file: [] }
}
process.stdout.write(Schema.encodeSync(Protobuf.toCodec(CodeGeneratorResponse))(response))
