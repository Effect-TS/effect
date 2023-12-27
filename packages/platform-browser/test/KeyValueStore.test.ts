import * as Kv from "@effect/platform-browser/KeyValueStore"
// @ts-ignore
import { testLayer } from "@effect/platform/test/KeyValueStore.test"
import { describe } from "vitest"

describe("KeyValueStore / layerLocalStorage", () => testLayer(Kv.layerLocalStorage))
describe("KeyValueStore / layerSessionStorage", () => testLayer(Kv.layerSessionStorage))
