#!/bin/sh
# Generates effect/protobuf/ProtobufDescriptor and effect/protobuf/ProtobufPlugin
# with protoc-gen-effect itself. Pass --check to only list out-of-date modules.
#
# descriptor-set.binpb holds descriptor.proto and plugin.proto of protoc 36.2,
# with their comments:
#
#   protoc --include_source_info --descriptor_set_out=descriptor-set.binpb \
#     -I <protoc>/include google/protobuf/descriptor.proto google/protobuf/compiler/plugin.proto
set -e
cd "$(dirname "$0")"

jsdoc="@stability experimental
@category {category}
@since 4.0.7"

for module in ProtobufDescriptor:google/protobuf/descriptor.proto ProtobufPlugin:google/protobuf/compiler/plugin.proto; do
  name="${module%%:*}"
  node ../src/bin.ts generate descriptor-set.binpb "$@" \
    --out ../../../effect/src/protobuf \
    --file "${module#*:}=$name.ts" \
    --header "$(cat "$name.header.txt")" \
    --jsdoc "$jsdoc" \
    --import-map effect/Schema=../Schema.ts \
    --import-map effect/protobuf/Protobuf=./Protobuf.ts \
    --import-map effect/protobuf/ProtobufDescriptor=./ProtobufDescriptor.ts
done
