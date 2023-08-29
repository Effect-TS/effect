import "vitest-localstorage-mock"
import * as Kv from "@effect/platform-browser/KeyValueStore"
import { testLayer } from "@effect/platform/test/KeyValueStore.test"

describe("KeyValueStore / layerLocalStorage", () => testLayer(Kv.layerLocalStorage))
describe("KeyValueStore / layerSessionStorage", () => testLayer(Kv.layerSessionStorage))
