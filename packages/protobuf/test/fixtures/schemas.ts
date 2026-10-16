/**
 * kitchen_sink.proto written schema-first, plus a typed error for PointService.
 */
import { ConnectRpc, Protobuf } from "@effect/protobuf"
import { Schema } from "effect"
import { Rpc, RpcGroup } from "effect/rpc"

export const Point = Schema.Struct({
  x: Protobuf.Int32.pipe(Protobuf.field(1)),
  y: Protobuf.Int32.pipe(Protobuf.field(2))
}).annotate({ identifier: "acme.v1.Point" })

export const Scalars = Schema.Struct({
  fDouble: Schema.Number.pipe(Protobuf.field(1)),
  fFloat: Protobuf.Float.pipe(Protobuf.field(2)),
  fInt32: Protobuf.Int32.pipe(Protobuf.field(3)),
  fInt64: Protobuf.Int64.pipe(Protobuf.field(4)),
  fUint32: Protobuf.UInt32.pipe(Protobuf.field(5)),
  fUint64: Protobuf.UInt64.pipe(Protobuf.field(6)),
  fSint32: Protobuf.SInt32.pipe(Protobuf.field(7)),
  fSint64: Protobuf.SInt64.pipe(Protobuf.field(8)),
  fFixed32: Protobuf.Fixed32.pipe(Protobuf.field(9)),
  fFixed64: Protobuf.Fixed64.pipe(Protobuf.field(10)),
  fSfixed32: Protobuf.SFixed32.pipe(Protobuf.field(11)),
  fSfixed64: Protobuf.SFixed64.pipe(Protobuf.field(12)),
  fBool: Schema.Boolean.pipe(Protobuf.field(13)),
  fString: Schema.String.pipe(Protobuf.field(14)),
  fBytes: Schema.Uint8Array.pipe(Protobuf.field(15))
}).annotate({ identifier: "acme.v1.Scalars" })

export const Color = Schema.Enum({ COLOR_UNSPECIFIED: 0, COLOR_RED: 1, COLOR_GREEN: 2, COLOR_BLUE: 3 }).annotate({
  identifier: "acme.v1.Color"
})

export const Circle = Schema.Struct({
  center: Schema.optionalKey(Point).pipe(Protobuf.field(1)),
  radius: Schema.Number.pipe(Protobuf.field(2))
}).annotate({ identifier: "acme.v1.Shapes.Circle" })

export const Shapes = Schema.Struct({
  numbers: Schema.Array(Protobuf.Int32).pipe(Protobuf.field(1)),
  names: Schema.Array(Schema.String).pipe(Protobuf.field(2)),
  points: Schema.Array(Point).pipe(Protobuf.field(3)),
  colors: Schema.Array(Color).pipe(Protobuf.field(4)),
  counts: Schema.Record(Schema.String, Protobuf.Int32).pipe(Protobuf.field(5)),
  labels: Schema.Record(Protobuf.Int32, Schema.String).pipe(Protobuf.field(6)),
  namedPoints: Schema.Record(Schema.String, Point).pipe(Protobuf.field(7)),
  nickname: Schema.optionalKey(Schema.String).pipe(Protobuf.field(8)),
  maybeNumber: Schema.optionalKey(Protobuf.Int32).pipe(Protobuf.field(9)),
  origin: Schema.optionalKey(Point).pipe(Protobuf.field(10)),
  primary: Color.pipe(Protobuf.field(11)),
  shape: Schema.optionalKey(Schema.Union([
    Schema.TaggedStruct("circle", { value: Circle.pipe(Protobuf.field(12)) }),
    Schema.TaggedStruct("squareCorner", { value: Point.pipe(Protobuf.field(13)) }),
    Schema.TaggedStruct("label", { value: Schema.String.pipe(Protobuf.field(14)) }),
    Schema.TaggedStruct("code", { value: Protobuf.Int64.pipe(Protobuf.field(15)) })
  ]))
}).annotate({ identifier: "acme.v1.Shapes" })

export const WellKnown = Schema.Struct({
  createdAt: Schema.optionalKey(Protobuf.Timestamp).pipe(Protobuf.field(1)),
  ttl: Schema.optionalKey(Protobuf.Duration).pipe(Protobuf.field(2)),
  maybeText: Schema.optionalKey(Protobuf.StringValue).pipe(Protobuf.field(3)),
  maybeInt: Schema.optionalKey(Protobuf.Int32Value).pipe(Protobuf.field(4)),
  maybeBool: Schema.optionalKey(Protobuf.BoolValue).pipe(Protobuf.field(5)),
  attributes: Schema.optionalKey(Protobuf.Struct).pipe(Protobuf.field(6)),
  anything: Schema.optionalKey(Protobuf.Value).pipe(Protobuf.field(7)),
  nothing: Schema.optionalKey(Protobuf.Empty).pipe(Protobuf.field(8))
}).annotate({ identifier: "acme.v1.WellKnown" })

export interface TreeNode {
  readonly name: string
  readonly children: ReadonlyArray<TreeNode>
}
export const TreeNode: Schema.Codec<TreeNode> = Schema.Struct({
  name: Schema.String.pipe(Protobuf.field(1)),
  children: Schema.Array(Schema.suspend((): Schema.Codec<TreeNode> => TreeNode)).pipe(Protobuf.field(2))
}).annotate({ identifier: "acme.v1.TreeNode" })

export class PointNotFound extends Schema.TaggedError<PointNotFound>("acme.v1.PointNotFound")("PointNotFound", {
  id: Protobuf.Int32.pipe(Protobuf.field(1))
}, ConnectRpc.code("not_found")) {}

export const PointService = RpcGroup.make(
  Rpc.make("GetPoint", {
    payload: { id: Protobuf.Int32.pipe(Protobuf.field(1)) },
    success: Point,
    error: PointNotFound
  }),
  Rpc.make("ListPoints", {
    payload: { limit: Protobuf.Int32.pipe(Protobuf.field(1)) },
    success: Point,
    stream: true
  }),
  Rpc.make("Ping", { payload: Protobuf.Empty, success: Protobuf.Empty })
).annotate(ConnectRpc.ServiceName, "acme.v1.PointService")
