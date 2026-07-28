import * as DenoKeyValueStore from "@effect/platform-deno/DenoKeyValueStore"
import { describe } from "@effect/vitest"
import { testLayer } from "../../effect/test/unstable/persistence/KeyValueStore.test.ts"

describe("KeyValueStore / layerLocalStorage", () => testLayer(DenoKeyValueStore.layerLocalStorage))

describe("KeyValueStore / layerSessionStorage", () => testLayer(DenoKeyValueStore.layerSessionStorage))
