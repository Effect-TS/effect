import * as Layer from "@effect/io/Layer"
import * as Fs from "@effect/platform-node/FileSystem"
import * as Path from "@effect/platform-node/Path"
import * as Kv from "@effect/platform/KeyValueStore"
import { testLayer } from "@effect/platform/test/KeyValueStore.test"

const KeyValueLive = Kv.layerFileSystem(`${__dirname}/fixtures/kv`).pipe(
  Layer.use(Fs.layer),
  Layer.use(Path.layer)
)

describe("KeyValueStore / layerFileSystem", () => testLayer(KeyValueLive))
