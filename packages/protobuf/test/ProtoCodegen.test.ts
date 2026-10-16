import {
  create,
  createFileRegistry,
  type DescMessage,
  equals,
  fromBinary,
  type MessageInitShape,
  toBinary,
  toJson
} from "@bufbuild/protobuf"
import { FileDescriptorSetSchema, timestampFromMs, ValueSchema } from "@bufbuild/protobuf/wkt"
import { Protobuf } from "@effect/protobuf"
import * as Descriptor from "@effect/protobuf/Descriptor"
import * as ProtoCodegen from "@effect/protobuf/ProtoCodegen"
import { assert, describe, it } from "@effect/vitest"
import { DateTime, Duration, Schema } from "effect"
import { execFileSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import * as legacy from "./fixtures/codegen/gen-effect/acme/legacy/v1/legacy_effect.ts"
import * as ks from "./fixtures/gen-effect/acme/v1/kitchen_sink_effect.ts"
// oxlint-disable-next-line effect/no-js-extension-imports -- generated JS fixture
import * as es from "./fixtures/gen-es/acme/v1/kitchen_sink_pb.js"

const fixtures = path.join(import.meta.dirname, "fixtures")
const buf = path.join(import.meta.dirname, "..", "node_modules", ".bin", "buf")

const readTree = (dir: string): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const entry of fs.readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (entry.isFile()) {
      const file = path.join(entry.parentPath, entry.name)
      out[path.relative(dir, file)] = fs.readFileSync(file, "utf8")
    }
  }
  return out
}

const buildDescriptorSet = (cwd: string): Uint8Array<ArrayBuffer> => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "protoc-gen-effect-")), "set.binpb")
  execFileSync(buf, ["build", "-o", out], { cwd })
  return new Uint8Array(fs.readFileSync(out))
}

interface Case<S extends Schema.Codec<any, any>, D extends DescMessage> {
  readonly name: string
  readonly schema: S
  readonly desc: D
  readonly value: S["Type"]
  readonly init: MessageInitShape<D>
}

const testCase = <S extends Schema.Codec<any, any>, D extends DescMessage>(c: Case<S, D>) => c

const assertInterop = <S extends Schema.Codec<any, any>, D extends DescMessage>(c: Case<S, D>) => {
  const codec = Protobuf.toCodec(c.schema)
  const expected = create(c.desc, c.init)
  // effect → bufbuild
  const bytes = Schema.encodeSync(codec)(c.value)
  assert.isTrue(equals(c.desc, fromBinary(c.desc, bytes), expected), "bufbuild decodes the effect encoding")
  // bufbuild → effect
  assert.deepStrictEqual(Schema.decodeSync(codec)(toBinary(c.desc, expected)), c.value)
  // proto3 JSON
  assert.deepStrictEqual(Schema.encodeSync(Protobuf.toCodecJson(c.schema))(c.value), toJson(c.desc, expected))
}

describe("ProtoCodegen", () => {
  describe("protoc-gen-effect", () => {
    it.each([
      ["kitchen sink", "."],
      ["proto2 and cross-file references", "codegen"]
    ])("reproduces the checked-in output: %s", (_, dir) => {
      const cwd = path.join(fixtures, dir)
      const out = fs.mkdtempSync(path.join(os.tmpdir(), "protoc-gen-effect-"))
      execFileSync(buf, ["generate", "--template", "buf.gen.effect.yaml", "-o", out], { cwd })
      assert.deepStrictEqual(readTree(path.join(out, "gen-effect")), readTree(path.join(cwd, "gen-effect")))
    })

    it("reports unsupported input in the response", () => {
      const request = Schema.decodeSync(Protobuf.toCodec(Descriptor.CodeGeneratorRequest))(
        Schema.encodeSync(Protobuf.toCodec(Descriptor.CodeGeneratorRequest))({
          fileToGenerate: ["a.proto"],
          parameter: "import_extension=ts",
          protoFile: [{
            name: "a.proto",
            syntax: "editions",
            edition: 1000,
            dependency: [],
            messageType: [],
            enumType: [],
            service: []
          }],
          sourceFileDescriptors: []
        })
      )
      assert.deepStrictEqual(ProtoCodegen.generate(request), {
        error: "a.proto: editions are not supported by the prototype",
        supportedFeatures: 1n,
        file: []
      })
    })
  })

  describe("generateFiles", () => {
    const set = Schema.decodeSync(Protobuf.toCodec(Descriptor.FileDescriptorSet))(
      buildDescriptorSet(path.join(fixtures, "codegen"))
    )

    it.each(
      [
        ["js", `from "../../common/v1/common_effect.js"`],
        ["ts", `from "../../common/v1/common_effect.ts"`],
        ["none", `from "../../common/v1/common_effect"`]
      ] as const
    )("import_extension=%s", (importExtension, expected) => {
      const [file] = ProtoCodegen.generateFiles(set.file, {
        filesToGenerate: ["acme/legacy/v1/legacy.proto"],
        importExtension,
        effectProtobufImport: "#protobuf"
      })
      assert.strictEqual(file.name, "acme/legacy/v1/legacy_effect.ts")
      assert.include(file.content, `import * as acme_common_v1_common_effect ${expected}`)
      assert.include(file.content, `import { ConnectRpc, Protobuf } from "#protobuf"`)
    })
  })

  describe("byte and JSON compatibility with @bufbuild/protobuf", () => {
    it.each([
      testCase({
        name: "Scalars",
        schema: ks.Scalars,
        desc: es.ScalarsSchema,
        value: {
          fDouble: 1.5,
          fFloat: -2.5,
          fInt32: -3,
          fInt64: -9007199254740993n,
          fUint32: 4294967295,
          fUint64: 18446744073709551615n,
          fSint32: -2147483648,
          fSint64: -9223372036854775808n,
          fFixed32: 7,
          fFixed64: 8n,
          fSfixed32: -9,
          fSfixed64: -10n,
          fBool: true,
          fString: "héllo",
          fBytes: new Uint8Array([0, 1, 255])
        },
        init: {
          fDouble: 1.5,
          fFloat: -2.5,
          fInt32: -3,
          fInt64: -9007199254740993n,
          fUint32: 4294967295,
          fUint64: 18446744073709551615n,
          fSint32: -2147483648,
          fSint64: -9223372036854775808n,
          fFixed32: 7,
          fFixed64: 8n,
          fSfixed32: -9,
          fSfixed64: -10n,
          fBool: true,
          fString: "héllo",
          fBytes: new Uint8Array([0, 1, 255])
        }
      }),
      testCase({
        name: "Shapes (zero values)",
        schema: ks.Shapes,
        desc: es.ShapesSchema,
        value: {
          numbers: [],
          names: [],
          points: [],
          colors: [],
          counts: {},
          labels: {},
          namedPoints: {},
          primary: ks.Color.COLOR_UNSPECIFIED
        },
        init: {}
      }),
      testCase({
        name: "Shapes (oneof message, explicit zero presence)",
        schema: ks.Shapes,
        desc: es.ShapesSchema,
        value: {
          numbers: [1, -2, 300],
          names: ["a", ""],
          points: [{ x: 1, y: 2 }, { x: 0, y: 0 }],
          colors: [ks.Color.COLOR_RED, ks.Color.COLOR_UNSPECIFIED],
          counts: { a: 1, b: 0 },
          labels: { 1: "one", [-2]: "minus two" },
          namedPoints: { origin: { x: 0, y: 0 } },
          nickname: "",
          maybeNumber: 0,
          origin: { x: 0, y: 0 },
          primary: ks.Color.COLOR_BLUE,
          shape: { _tag: "circle", value: { center: { x: 3, y: 4 }, radius: 5 } }
        },
        init: {
          numbers: [1, -2, 300],
          names: ["a", ""],
          points: [{ x: 1, y: 2 }, { x: 0, y: 0 }],
          colors: [es.Color.RED, es.Color.UNSPECIFIED],
          counts: { a: 1, b: 0 },
          labels: { 1: "one", [-2]: "minus two" },
          namedPoints: { origin: { x: 0, y: 0 } },
          nickname: "",
          maybeNumber: 0,
          origin: { x: 0, y: 0 },
          primary: es.Color.BLUE,
          shape: { case: "circle", value: { center: { x: 3, y: 4 }, radius: 5 } }
        }
      }),
      testCase({
        name: "Shapes (oneof scalar)",
        schema: ks.Shapes,
        desc: es.ShapesSchema,
        value: {
          numbers: [],
          names: [],
          points: [],
          colors: [],
          counts: {},
          labels: {},
          namedPoints: {},
          primary: ks.Color.COLOR_UNSPECIFIED,
          shape: { _tag: "code", value: 0n }
        },
        init: { shape: { case: "code", value: 0n } }
      }),
      testCase({
        name: "WellKnown",
        schema: ks.WellKnown,
        desc: es.WellKnownSchema,
        value: {
          createdAt: DateTime.makeUnsafe(1700000000123),
          ttl: Duration.millis(90500),
          maybeText: "",
          maybeInt: 0,
          maybeBool: false,
          attributes: { a: 1, b: [true, null, "x"] },
          anything: "x",
          nothing: {}
        },
        init: {
          createdAt: timestampFromMs(1700000000123),
          ttl: { seconds: 90n, nanos: 500000000 },
          maybeText: "",
          maybeInt: 0,
          maybeBool: false,
          attributes: { a: 1, b: [true, null, "x"] },
          anything: create(ValueSchema, { kind: { case: "stringValue", value: "x" } }),
          nothing: {}
        }
      }),
      testCase({
        name: "TreeNode",
        schema: ks.TreeNode,
        desc: es.TreeNodeSchema,
        value: { name: "root", children: [{ name: "a", children: [{ name: "a1", children: [] }] }] },
        init: { name: "root", children: [{ name: "a", children: [{ name: "a1" }] }] }
      })
    ])("$name", (c) => assertInterop(c as Case<Schema.Codec<unknown>, DescMessage>))

    it("proto2 and cross-file references", () => {
      const registry = createFileRegistry(
        fromBinary(FileDescriptorSetSchema, buildDescriptorSet(path.join(fixtures, "codegen")))
      )
      const desc = registry.getMessage("acme.legacy.v1.Order")!
      const value: legacy.Order = {
        id: "o-1",
        quantity: 0,
        unpacked: [1, 2],
        packed: [-1n, 2n],
        price: { currencyCode: "EUR", units: 12 },
        level: 1,
        displayName: "First",
        field1: "f",
        notes: { "-5": "minus five" },
        byFlag: { true: { currencyCode: "USD", units: 1 } },
        payment: { _tag: "cardToken", value: "tok" },
        items: [{
          sku: "s",
          children: [{ children: [], byIndex: {} }],
          order: { id: "o-2", unpacked: [], packed: [], notes: {}, byFlag: {}, items: [] },
          byIndex: { 3: { children: [], byIndex: {} } }
        }],
        status: legacy.Order_Status.STATUS_DONE
      }
      assertInterop({
        name: "Order",
        schema: legacy.Order,
        desc,
        value,
        init: {
          id: "o-1",
          quantity: 0,
          unpacked: [1, 2],
          packed: [-1n, 2n],
          price: { currencyCode: "EUR", units: 12n },
          level: 1,
          displayName: "First",
          field1: "f",
          notes: { "-5": "minus five" },
          byFlag: { true: { currencyCode: "USD", units: 1n } },
          payment: { case: "cardToken", value: "tok" },
          items: [{
            sku: "s",
            children: [{}],
            order: { id: "o-2" },
            byIndex: { 3: {} }
          }],
          status: 2
        } as MessageInitShape<DescMessage>
      })
    })
  })
})
