import { assert, describe, it } from "@effect/vitest"
import { Protobuf, ProtobufDescriptor } from "effect/encoding"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"

// `protoc --descriptor_set_out` (protoc 36.2) of
//
//   syntax = "proto3";
//   package demo;
//   import "google/protobuf/descriptor.proto";
//   extend google.protobuf.MessageOptions { string table = 50000; }
//   message User {
//     option (table) = "users";
//     string name = 1;
//     repeated int32 ids = 2;
//   }
const descriptorSet =
  "0aad010a096f70742e70726f746f120464656d6f1a20676f6f676c652f70726f746f6275662f64657363726970746f722e70726f746f22370a045573657212120a046e616d6518012001280952046e616d6512100a0369647318022003280552036964733a0982b5180575736572733a370a057461626c65121f2e676f6f676c652e70726f746f6275662e4d6573736167654f7074696f6e7318d086032001280952057461626c65620670726f746f33"

describe("ProtobufDescriptor", () => {
  it("reads and writes a descriptor set, keeping custom options", () => {
    const codec = Protobuf.toCodec(ProtobufDescriptor.FileDescriptorSet)
    const bytes = new Uint8Array(Buffer.from(descriptorSet, "hex"))
    const set = Schema.decodeSync(codec)(bytes)
    assert.deepStrictEqual(set.file[0].messageType[0].field, [
      { name: "name", number: 1, label: "LABEL_OPTIONAL", type: "TYPE_STRING", jsonName: "name" },
      { name: "ids", number: 2, label: "LABEL_REPEATED", type: "TYPE_INT32", jsonName: "ids" }
    ])
    // option (table) = "users": field 50000, length-delimited
    const options = set.file[0].messageType[0].options!
    assert.deepStrictEqual(
      options[Protobuf.unknown],
      new Uint8Array([0x82, 0xb5, 0x18, 5, ...new TextEncoder().encode("users")])
    )
    const table = Protobuf.extension(ProtobufDescriptor.MessageOptions, 50000, Schema.String)
    assert.deepStrictEqual(Protobuf.getExtension(options, table), Option.some("users"))
    assert.deepStrictEqual(Schema.encodeSync(codec)(set), bytes)
  })
})
