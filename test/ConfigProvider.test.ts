import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Chunk from "effect/Chunk"
import * as Config from "effect/Config"
import * as ConfigError from "effect/ConfigError"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Equal from "effect/Equal"
import * as Exit from "effect/Exit"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as LogLevel from "effect/LogLevel"
import * as Option from "effect/Option"
import * as Secret from "effect/Secret"
import { assert, describe, expect } from "vitest"

interface HostPort {
  readonly host: string
  readonly port: number
}

const hostPortConfig: Config.Config<HostPort> = Config.all({
  host: Config.string("host"),
  port: Config.integer("port")
})

interface HostPorts {
  readonly hostPorts: ReadonlyArray<HostPort>
}

const hostPortsConfig: Config.Config<HostPorts> = Config.all({
  hostPorts: Config.array(hostPortConfig, "hostPorts")
})

interface ServiceConfig {
  readonly hostPort: HostPort
  readonly timeout: number
}

const serviceConfigConfig: Config.Config<ServiceConfig> = Config.all({
  hostPort: hostPortConfig.pipe(Config.nested("hostPort")),
  timeout: Config.integer("timeout")
})

interface StockDay {
  readonly date: Date
  readonly open: number
  readonly close: number
  readonly low: number
  readonly high: number
  readonly volume: number
}

const stockDayConfig: Config.Config<StockDay> = Config.all({
  date: Config.date("date"),
  open: Config.number("open"),
  close: Config.number("close"),
  low: Config.number("low"),
  high: Config.number("high"),
  volume: Config.integer("volume")
})

interface SNP500 {
  readonly stockDays: HashMap.HashMap<string, StockDay>
}

const snp500Config: Config.Config<SNP500> = Config.all({
  stockDays: Config.hashMap(stockDayConfig)
})

interface WebScrapingTargets {
  readonly targets: HashSet.HashSet<string>
}

const webScrapingTargetsConfig: Config.Config<WebScrapingTargets> = Config.all({
  targets: Config.hashSet(Config.string(), "targets")
})

const webScrapingTargetsConfigWithDefault = Config.all({
  targets: Config.chunk(Config.string()).pipe(
    Config.withDefault(Chunk.make("https://effect.website2", "https://github.com/Effect-TS2"))
  )
})

const provider = (map: Map<string, string>): ConfigProvider.ConfigProvider => {
  return ConfigProvider.fromMap(map)
}

describe("ConfigProvider", () => {
  it.effect("flat atoms", () =>
    Effect.gen(function*($) {
      const map = new Map([["host", "localhost"], ["port", "8080"]])
      const result = yield* $(provider(map).load(hostPortConfig))
      assert.deepStrictEqual(result, {
        host: "localhost",
        port: 8080
      })
    }))

  it.effect("nested atoms", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["hostPort.host", "localhost"],
        ["hostPort.port", "8080"],
        ["timeout", "1000"]
      ])
      const result = yield* $(provider(map).load(serviceConfigConfig))
      assert.deepStrictEqual(result, {
        hostPort: {
          host: "localhost",
          port: 8080
        },
        timeout: 1000
      })
    }))

  it.effect("top-level list with same number of elements per key", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["hostPorts.host", "localhost,localhost,localhost"],
        ["hostPorts.port", "8080,8080,8080"]
      ])
      const result = yield* $(provider(map).load(hostPortsConfig))
      assert.deepStrictEqual(result, {
        hostPorts: Array.from({ length: 3 }, () => ({ host: "localhost", port: 8080 }))
      })
    }))

  it.effect("top-level missing list", () =>
    Effect.gen(function*($) {
      const map = new Map()
      const result = yield* $(Effect.exit(provider(map).load(hostPortsConfig)))
      assert.isTrue(Exit.isFailure(result))
    }))

  it.effect("simple map", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["name", "Sherlock Holmes"],
        ["address", "221B Baker Street"]
      ])
      const result = yield* $(provider(map).load(Config.hashMap(Config.string())))
      assert.deepStrictEqual(
        result,
        HashMap.make(
          ["name", "Sherlock Holmes"],
          ["address", "221B Baker Street"]
        )
      )
    }))

  it.effect("top-level lists with multi-character sequence delimiters", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["hostPorts.host", "localhost///localhost///localhost"],
        ["hostPorts.port", "8080///8080///8080"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map, { seqDelim: "///" }).load(hostPortsConfig))
      assert.deepStrictEqual(result, {
        hostPorts: Array.from({ length: 3 }, () => ({ host: "localhost", port: 8080 }))
      })
    }))

  it.effect("top-level lists with special regex multi-character sequence delimiter", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["hostPorts.host", "localhost|||localhost|||localhost"],
        ["hostPorts.port", "8080|||8080|||8080"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map, { seqDelim: "|||" }).load(hostPortsConfig))
      assert.deepStrictEqual(result, {
        hostPorts: Array.from({ length: 3 }, () => ({ host: "localhost", port: 8080 }))
      })
    }))

  it.effect("top-level lists with special regex character sequence delimiter", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["hostPorts.host", "localhost*localhost*localhost"],
        ["hostPorts.port", "8080*8080*8080"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map, { seqDelim: "*" }).load(hostPortsConfig))
      assert.deepStrictEqual(result, {
        hostPorts: Array.from({ length: 3 }, () => ({ host: "localhost", port: 8080 }))
      })
    }))

  it.effect("top-level list with different number of elements per key fails", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["hostPorts.host", "localhost"],
        ["hostPorts.port", "8080,8080,8080"]
      ])
      const result = yield* $(Effect.exit(provider(map).load(hostPortsConfig)))
      assert.deepStrictEqual(
        result,
        Exit.fail(
          ConfigError.MissingData(
            ["hostPorts"],
            "The element at index 1 in a sequence at path \"hostPorts\" was missing"
          )
        )
      )
    }))

  it.effect("flat atoms of different types", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["date", "2022-10-28"],
        ["open", "98.8"],
        ["close", "150.0"],
        ["low", "98.0"],
        ["high", "151.5"],
        ["volume", "100091990"]
      ])
      const result = yield* $(provider(map).load(stockDayConfig))
      assert.deepStrictEqual(result, {
        date: new Date("2022-10-28"),
        open: 98.8,
        close: 150.0,
        low: 98.0,
        high: 151.5,
        volume: 100091990
      })
    }))

  it.effect("tables", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["Effect.date", "2022-10-28"],
        ["Effect.open", "98.8"],
        ["Effect.close", "150.0"],
        ["Effect.low", "98.0"],
        ["Effect.high", "151.5"],
        ["Effect.volume", "100091990"]
      ])
      const result = yield* $(provider(map).load(snp500Config))
      assert.deepStrictEqual(result, {
        stockDays: HashMap.make([
          "Effect",
          {
            date: new Date("2022-10-28"),
            open: 98.8,
            close: 150.0,
            low: 98.0,
            high: 151.5,
            volume: 100091990
          }
        ])
      })
    }))

  it.effect("empty tables", () =>
    Effect.gen(function*($) {
      const result = yield* $(provider(new Map()).load(snp500Config))
      assert.deepStrictEqual(result, { stockDays: HashMap.empty() })
    }))

  it.effect("collection of atoms", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["targets", "https://effect.website,https://github.com/Effect-TS"]
      ])
      const result = yield* $(provider(map).load(webScrapingTargetsConfig))
      assert.deepStrictEqual(result, {
        targets: HashSet.make("https://effect.website", "https://github.com/Effect-TS")
      })
    }))

  it.effect("collection of atoms falls back to default", () =>
    Effect.gen(function*($) {
      const map = new Map()
      const result = yield* $(provider(map).load(webScrapingTargetsConfigWithDefault))
      assert.deepStrictEqual(result, {
        targets: Chunk.make("https://effect.website2", "https://github.com/Effect-TS2")
      })
    }))

  it.effect("indexed - simple", () =>
    Effect.gen(function*($) {
      const config = Config.array(Config.integer(), "id")
      const map = new Map([
        ["id[0]", "1"],
        ["id[1]", "2"],
        ["id[2]", "3"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map).load(config))
      expect(result).toEqual([1, 2, 3])
    }))

  it.effect("indexed sequence - simple with list values", () =>
    Effect.gen(function*($) {
      const config = Config.array(Config.array(Config.integer()), "id")
      const map = new Map([
        ["id[0]", "1, 2"],
        ["id[1]", "3, 4"],
        ["id[2]", "5, 6"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map).load(config))
      expect(result).toEqual([[1, 2], [3, 4], [5, 6]])
    }))

  it.effect("indexed sequence - one product type", () =>
    Effect.gen(function*($) {
      const config = Config.array(
        Config.all({
          age: Config.integer("age"),
          id: Config.integer("id")
        }),
        "employees"
      )
      const map = new Map([
        ["employees[0].age", "1"],
        ["employees[0].id", "1"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map).load(config))
      expect(result).toEqual([{ age: 1, id: 1 }])
    }))

  it.effect("indexed sequence - multiple product types", () =>
    Effect.gen(function*($) {
      const config = Config.array(
        Config.all({
          age: Config.integer("age"),
          id: Config.integer("id")
        }),
        "employees"
      )
      const map = new Map([
        ["employees[0].age", "1"],
        ["employees[0].id", "2"],
        ["employees[1].age", "3"],
        ["employees[1].id", "4"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map).load(config))
      expect(result).toEqual([{ age: 1, id: 2 }, { age: 3, id: 4 }])
    }))

  it.effect("indexed sequence - multiple product types with missing fields", () =>
    Effect.gen(function*($) {
      const config = Config.array(
        Config.all({
          age: Config.integer("age"),
          id: Config.integer("id")
        }),
        "employees"
      )
      const map = new Map([
        ["employees[0].age", "1"],
        ["employees[0].id", "2"],
        ["employees[1].age", "3"],
        ["employees[1]", "4"]
      ])
      const result = yield* $(
        Effect.exit(ConfigProvider.fromMap(map).load(config))
      )
      assert.isTrue(
        Exit.isFailure(result) &&
          Cause.isFailType(result.i0) &&
          ConfigError.isMissingData(result.i0.error) &&
          // TODO: fix error message to not include `.[index]`
          result.i0.error.message === "Expected employees.[1].id to exist in the provided map" &&
          Equal.equals(Chunk.unsafeFromArray(result.i0.error.path), Chunk.make("employees", "[1]", "id"))
      )
    }))

  it.effect("indexed sequence - multiple product types with optional fields", () =>
    Effect.gen(function*($) {
      const config = Config.array(
        Config.all({
          age: Config.option(Config.integer("age")),
          id: Config.integer("id")
        }),
        "employees"
      )
      const map = new Map([
        ["employees[0].age", "1"],
        ["employees[0].id", "2"],
        ["employees[1].id", "4"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map).load(config))
      expect(result).toEqual([{ age: Option.some(1), id: 2 }, { age: Option.none(), id: 4 }])
    }))

  it.effect("indexed sequence - multiple product types with sequence fields", () =>
    Effect.gen(function*($) {
      const config = Config.array(
        Config.all({
          refunds: Config.array(Config.integer(), "refunds"),
          id: Config.integer("id")
        }),
        "employees"
      )
      const map = new Map([
        ["employees[0].refunds", "1,2,3"],
        ["employees[0].id", "0"],
        ["employees[1].id", "1"],
        ["employees[1].refunds", "4,5,6"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map).load(config))
      expect(result).toEqual([{ refunds: [1, 2, 3], id: 0 }, { refunds: [4, 5, 6], id: 1 }])
    }))

  it.effect("indexed sequence - product type of indexed sequences with reusable config", () =>
    Effect.gen(function*($) {
      const idAndAge = Config.all({
        id: Config.integer("id"),
        age: Config.integer("age")
      })
      const config = Config.all({
        employees: Config.array(idAndAge, "employees"),
        students: Config.array(idAndAge, "students")
      })
      const map = new Map([
        ["employees[0].id", "0"],
        ["employees[1].id", "1"],
        ["employees[0].age", "10"],
        ["employees[1].age", "11"],
        ["students[0].id", "20"],
        ["students[1].id", "30"],
        ["students[0].age", "2"],
        ["students[1].age", "3"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map).load(config))
      expect(result).toEqual({
        employees: [{ id: 0, age: 10 }, { id: 1, age: 11 }],
        students: [{ id: 20, age: 2 }, { id: 30, age: 3 }]
      })
    }))

  it.effect("indexed sequence - map of indexed sequences", () =>
    Effect.gen(function*($) {
      const employee = Config.all({
        age: Config.integer("age"),
        id: Config.integer("id")
      })
      const config = Config.hashMap(Config.array(employee, "employees"), "departments")
      const map = new Map([
        ["departments.department1.employees[0].age", "10"],
        ["departments.department1.employees[0].id", "0"],
        ["departments.department1.employees[1].age", "20"],
        ["departments.department1.employees[1].id", "1"],
        ["departments.department2.employees[0].age", "10"],
        ["departments.department2.employees[0].id", "0"],
        ["departments.department2.employees[1].age", "20"],
        ["departments.department2.employees[1].id", "1"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map).load(config))
      const expectedEmployees = [{ age: 10, id: 0 }, { age: 20, id: 1 }]
      expect(Array.from(result)).toEqual([
        ["department1", expectedEmployees],
        ["department2", expectedEmployees]
      ])
    }))

  it.effect("indexed sequence - map", () =>
    Effect.gen(function*($) {
      const employee = Config.hashMap(Config.integer(), "details")
      const config = Config.array(employee, "employees")
      const map = new Map([
        ["employees[0].details.age", "10"],
        ["employees[0].details.id", "0"],
        ["employees[1].details.age", "20"],
        ["employees[1].details.id", "1"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map).load(config))
      expect(result.map((table) => Array.from(table))).toEqual([
        [["age", 10], ["id", 0]],
        [["age", 20], ["id", 1]]
      ])
    }))

  it.effect("indexed sequence - indexed sequences", () =>
    Effect.gen(function*($) {
      const employee = Config.all({
        age: Config.integer("age"),
        id: Config.integer("id")
      })
      const department = Config.array(employee, "employees")
      const config = Config.array(department, "departments")
      const map = new Map([
        ["departments[0].employees[0].age", "10"],
        ["departments[0].employees[0].id", "0"],
        ["departments[0].employees[1].age", "20"],
        ["departments[0].employees[1].id", "1"],
        ["departments[1].employees[0].age", "10"],
        ["departments[1].employees[0].id", "0"],
        ["departments[1].employees[1].age", "20"],
        ["departments[1].employees[1].id", "1"]
      ])
      const result = yield* $(ConfigProvider.fromMap(map).load(config))
      const expectedEmployees = [{ age: 10, id: 0 }, { age: 20, id: 1 }]
      expect(result).toEqual([expectedEmployees, expectedEmployees])
    }))

  it.effect("indexed sequence - multiple product types nested", () =>
    Effect.gen(function*($) {
      const employee = Config.all({
        age: Config.integer("age"),
        id: Config.integer("id")
      })
      const config = Config.array(employee, "employees")
      const map = new Map([
        ["parent.child.employees[0].age", "1"],
        ["parent.child.employees[0].id", "2"],
        ["parent.child.employees[1].age", "3"],
        ["parent.child.employees[1].id", "4"]
      ])
      const provider = ConfigProvider.fromMap(map).pipe(
        ConfigProvider.nested("child"),
        ConfigProvider.nested("parent")
      )
      const result = yield* $(provider.load(config))
      expect(result).toEqual([{ age: 1, id: 2 }, { age: 3, id: 4 }])
    }))

  it.effect("indexed sequence - multiple product types unnested", () =>
    Effect.gen(function*($) {
      const employee = Config.all({
        age: Config.integer("age"),
        id: Config.integer("id")
      })
      const config = Config.array(employee, "employees").pipe(
        Config.nested("child"),
        Config.nested("parent")
      )
      const map = new Map([
        ["employees[0].age", "1"],
        ["employees[0].id", "2"],
        ["employees[1].age", "3"],
        ["employees[1].id", "4"]
      ])
      const provider = ConfigProvider.fromMap(map).pipe(
        ConfigProvider.unnested("parent"),
        ConfigProvider.unnested("child")
      )
      const result = yield* $(provider.load(config))
      expect(result).toEqual([{ age: 1, id: 2 }, { age: 3, id: 4 }])
    }))

  it.effect("logLevel", () =>
    Effect.gen(function*($) {
      const config = Config.logLevel("level")
      const map = new Map([["level", "ERROR"]])
      const result = yield* $(ConfigProvider.fromMap(map).load(config))
      expect(result).toEqual(LogLevel.Error)
    }))

  it.effect("accessing a non-existent key fails", () =>
    Effect.gen(function*($) {
      const map = new Map([
        ["k1.k3", "v"]
      ])
      const config = Config.string("k2").pipe(
        Config.nested("k1")
      )
      const result = yield* $(Effect.exit(provider(map).load(config)))
      assert.deepStrictEqual(
        result,
        Exit.fail(
          ConfigError.MissingData(
            ["k1", "k2"],
            "Expected k1.k2 to exist in the provided map"
          )
        )
      )
    }))

  it.effect("values are not split unless a sequence is expected", () =>
    Effect.gen(function*($) {
      const configProvider = ConfigProvider.fromMap(new Map([["greeting", "Hello, World!"]]))
      const result = yield* $(configProvider.load(Config.string("greeting")))
      assert.strictEqual(result, "Hello, World!")
    }))

  it.effect("constantCase", () =>
    Effect.gen(function*($) {
      const configProvider = ConfigProvider.fromMap(new Map([["CONSTANT_CASE", "value"]])).pipe(
        ConfigProvider.constantCase
      )
      const result = yield* $(configProvider.load(Config.string("constant.case")))
      assert.strictEqual(result, "value")
    }))

  it.effect("mapInputPath", () =>
    Effect.gen(function*($) {
      const configProvider = ConfigProvider.fromMap(new Map([["KEY", "VALUE"]])).pipe(
        ConfigProvider.mapInputPath((path) => path.toUpperCase())
      )
      const result = yield* $(configProvider.load(Config.string("key")))
      assert.strictEqual(result, "VALUE")
    }))

  it.effect("kebabCase", () =>
    Effect.gen(function*($) {
      const configProvider = ConfigProvider.fromMap(new Map([["kebab-case", "value"]])).pipe(
        ConfigProvider.kebabCase
      )
      const result = yield* $(configProvider.load(Config.string("kebabCase")))
      assert.strictEqual(result, "value")
    }))

  it.effect("lowerCase", () =>
    Effect.gen(function*($) {
      const configProvider = ConfigProvider.fromMap(new Map([["lowercase", "value"]])).pipe(
        ConfigProvider.lowerCase
      )
      const result = yield* $(configProvider.load(Config.string("lowerCase")))
      assert.strictEqual(result, "value")
    }))

  it.effect("nested", () =>
    Effect.gen(function*($) {
      const configProvider1 = ConfigProvider.fromMap(new Map([["nested.key", "value"]]))
      const config1 = Config.string("key").pipe(Config.nested("nested"))
      const configProvider2 = ConfigProvider.fromMap(new Map([["nested.key", "value"]])).pipe(
        ConfigProvider.nested("nested")
      )
      const config2 = Config.string("key")
      const result1 = yield* $(configProvider1.load(config1))
      const result2 = yield* $(configProvider2.load(config2))
      assert.strictEqual(result1, "value")
      assert.strictEqual(result2, "value")
    }))

  it.effect("nested - multiple layers of nesting", () =>
    Effect.gen(function*($) {
      const configProvider1 = ConfigProvider.fromMap(new Map([["parent.child.key", "value"]]))
      const config1 = Config.string("key").pipe(
        Config.nested("child"),
        Config.nested("parent")
      )
      const configProvider2 = ConfigProvider.fromMap(new Map([["parent.child.key", "value"]])).pipe(
        ConfigProvider.nested("child"),
        ConfigProvider.nested("parent")
      )
      const config2 = Config.string("key")
      const result1 = yield* $(configProvider1.load(config1))
      const result2 = yield* $(configProvider2.load(config2))
      assert.strictEqual(result1, "value")
      assert.strictEqual(result2, "value")
    }))

  it.effect("orElse - with flat data", () =>
    Effect.gen(function*($) {
      const configProvider = ConfigProvider.fromMap(
        new Map([
          ["key1", "value1"],
          ["key4", "value41"]
        ])
      ).pipe(
        ConfigProvider.orElse(() =>
          ConfigProvider.fromMap(
            new Map([
              ["key2", "value2"],
              ["key4", "value42"]
            ])
          )
        )
      )
      const result1 = yield* $(configProvider.load(Config.string("key1")))
      const result2 = yield* $(configProvider.load(Config.string("key2")))
      const result31 = yield* $(configProvider.load(Config.option(Config.string("key3"))))
      const result32 = yield* $(Effect.either(configProvider.load(Config.string("key3"))))
      const result4 = yield* $(configProvider.load(Config.string("key4")))

      expect(result1).toBe("value1")
      expect(result2).toBe("value2")
      expect(result31).toEqual(Option.none())
      expect(result32).toEqual(Either.left(ConfigError.Or(
        ConfigError.MissingData(["key3"], "Expected key3 to exist in the provided map"),
        ConfigError.MissingData(["key3"], "Expected key3 to exist in the provided map")
      )))
      expect(result4).toBe("value41")
    }))

  it.effect("orElse - with indexed sequences", () =>
    Effect.gen(function*($) {
      const configProvider = ConfigProvider.fromMap(
        new Map([
          ["parent1.child.employees[0].age", "1"],
          ["parent1.child.employees[0].id", "2"],
          ["parent1.child.employees[1].age", "3"],
          ["parent1.child.employees[1].id", "4"]
        ])
      ).pipe(
        ConfigProvider.orElse(() =>
          ConfigProvider.fromMap(
            new Map([
              ["parent1.child.employees[2].age", "5"],
              ["parent1.child.employees[2].id", "6"],
              ["parent2.child.employees[0].age", "11"],
              ["parent2.child.employees[0].id", "21"],
              ["parent2.child.employees[1].age", "31"],
              ["parent2.child.employees[1].id", "41"]
            ])
          )
        )
      )

      const product = Config.zip(Config.integer("age"), Config.integer("id"))
      const arrayConfig = Config.array(product, "employees")
      const config1 = arrayConfig.pipe(Config.nested("child"), Config.nested("parent1"))
      const config2 = arrayConfig.pipe(Config.nested("child"), Config.nested("parent2"))

      const result1 = yield* $(configProvider.load(config1))
      const result2 = yield* $(configProvider.load(config2))

      expect(result1).toEqual([[1, 2], [3, 4], [5, 6]])
      expect(result2).toEqual([[11, 21], [31, 41]])
    }))

  it.effect("orElse - with indexed sequences and each provider unnested", () =>
    Effect.gen(function*(_) {
      const configProvider = ConfigProvider.fromMap(
        new Map([
          ["employees[0].age", "1"],
          ["employees[0].id", "2"],
          ["employees[1].age", "3"],
          ["employees[1].id", "4"]
        ])
      ).pipe(
        ConfigProvider.unnested("parent1"),
        ConfigProvider.unnested("child"),
        ConfigProvider.orElse(() =>
          ConfigProvider.fromMap(
            new Map([
              ["employees[0].age", "11"],
              ["employees[0].id", "21"],
              ["employees[1].age", "31"],
              ["employees[1].id", "41"]
            ])
          ).pipe(
            ConfigProvider.unnested("parent2"),
            ConfigProvider.unnested("child")
          )
        )
      )

      const product = Config.zip(Config.integer("age"), Config.integer("id"))
      const arrayConfig = Config.array(product, "employees")
      const config1 = arrayConfig.pipe(Config.nested("child"), Config.nested("parent1"))
      const config2 = arrayConfig.pipe(Config.nested("child"), Config.nested("parent2"))
      const config3 = arrayConfig.pipe(Config.nested("child"), Config.nested("parent3"))

      const result1 = yield* _(configProvider.load(config1))
      const result2 = yield* _(configProvider.load(config2))
      const result3 = yield* _(Effect.either(configProvider.load(config3)))

      expect(result1).toEqual([[1, 2], [3, 4]])
      expect(result2).toEqual([[11, 21], [31, 41]])
      expect(result3).toEqual(Either.left(ConfigError.And(
        ConfigError.MissingData(
          ["parent3", "child", "employees"],
          "Expected parent1 to be in path in ConfigProvider#unnested"
        ),
        ConfigError.MissingData(
          ["parent3", "child", "employees"],
          "Expected parent2 to be in path in ConfigProvider#unnested"
        )
      )))
    }))

  it.effect("orElse - with index sequences and combined provider unnested", () =>
    Effect.gen(function*(_) {
      const configProvider = ConfigProvider.fromMap(
        new Map([
          ["employees[0].age", "1"],
          ["employees[0].id", "2"]
        ])
      ).pipe(
        ConfigProvider.orElse(() =>
          ConfigProvider.fromMap(
            new Map([
              ["employees[1].age", "3"],
              ["employees[1].id", "4"]
            ])
          )
        ),
        ConfigProvider.unnested("parent1"),
        ConfigProvider.unnested("child")
      )

      const product = Config.zip(Config.integer("age"), Config.integer("id"))
      const arrayConfig = Config.array(product, "employees")
      const config = arrayConfig.pipe(Config.nested("child"), Config.nested("parent1"))

      const result = yield* _(configProvider.load(config))

      expect(result).toEqual([[1, 2], [3, 4]])
    }))

  it.effect("secret", () =>
    Effect.gen(function*($) {
      const value = "Hello, World!"
      const configProvider = ConfigProvider.fromMap(new Map([["greeting", value]]))
      const result = yield* $(configProvider.load(Config.secret("greeting")))
      assert.deepStrictEqual(result, Secret.make(value.split("").map((c) => c.charCodeAt(0))))
    }))

  it.effect("snakeCase", () =>
    Effect.gen(function*($) {
      const configProvider = ConfigProvider.fromMap(new Map([["snake_case", "value"]])).pipe(
        ConfigProvider.snakeCase
      )
      const result = yield* $(configProvider.load(Config.string("snakeCase")))
      assert.strictEqual(result, "value")
    }))

  it.effect("unnested", () =>
    Effect.gen(function*($) {
      const configProvider1 = ConfigProvider.fromMap(new Map([["key", "value"]]))
      const config1 = Config.string("key")
      const configProvider2 = ConfigProvider.fromMap(new Map([["key", "value"]])).pipe(
        ConfigProvider.unnested("nested")
      )
      const config2 = Config.string("key").pipe(Config.nested("nested"))
      const result1 = yield* $(configProvider1.load(config1))
      const result2 = yield* $(configProvider2.load(config2))
      assert.strictEqual(result1, "value")
      assert.strictEqual(result2, "value")
    }))

  it.effect("unnested - multiple layers of nesting", () =>
    Effect.gen(function*($) {
      const configProvider1 = ConfigProvider.fromMap(new Map([["key", "value"]]))
      const config1 = Config.string("key")
      const configProvider2 = ConfigProvider.fromMap(new Map([["key", "value"]])).pipe(
        ConfigProvider.unnested("parent"),
        ConfigProvider.unnested("child")
      )
      const config2 = Config.string("key").pipe(
        Config.nested("child"),
        Config.nested("parent")
      )
      const result1 = yield* $(configProvider1.load(config1))
      const result2 = yield* $(configProvider2.load(config2))
      assert.strictEqual(result1, "value")
      assert.strictEqual(result2, "value")
    }))

  it.effect("unnested - failure", () =>
    Effect.gen(function*($) {
      const configProvider = ConfigProvider.fromMap(new Map([["key", "value"]])).pipe(
        ConfigProvider.unnested("nested")
      )
      const config = Config.string("key")
      const result = yield* $(Effect.exit(configProvider.load(config)))
      const error = ConfigError.MissingData(
        ["key"],
        "Expected nested to be in path in ConfigProvider#unnested"
      )
      assert.deepStrictEqual(result, Exit.fail(error))
    }))

  it.effect("upperCase", () =>
    Effect.gen(function*($) {
      const configProvider = ConfigProvider.fromMap(new Map([["UPPERCASE", "value"]])).pipe(
        ConfigProvider.upperCase
      )
      const result = yield* $(configProvider.load(Config.string("upperCase")))
      assert.strictEqual(result, "value")
    }))

  it.effect("within", () =>
    Effect.gen(function*($) {
      const configProvider = ConfigProvider.fromMap(new Map([["nesting1.key1", "value1"], ["nesting2.KEY2", "value2"]]))
        .pipe(
          ConfigProvider.within(["nesting2"], ConfigProvider.mapInputPath((s) => s.toUpperCase()))
        )
      const config = Config.string("key1").pipe(
        Config.nested("nesting1"),
        Config.zip(
          Config.string("key2").pipe(
            Config.nested("nesting2")
          )
        )
      )
      const result = yield* $(configProvider.load(config))
      assert.deepStrictEqual(result, ["value1", "value2"])
    }))

  it.effect("within - multiple layers of nesting", () =>
    Effect.gen(function*($) {
      const configProvider = ConfigProvider.fromMap(
        new Map([["nesting1.key1", "value1"], ["nesting2.nesting3.KEY2", "value2"]])
      ).pipe(
        ConfigProvider.within(["nesting2", "nesting3"], ConfigProvider.mapInputPath((s) => s.toUpperCase()))
      )
      const config = Config.string("key1").pipe(
        Config.nested("nesting1"),
        Config.zip(
          Config.string("key2").pipe(
            Config.nested("nesting3"),
            Config.nested("nesting2")
          )
        )
      )
      const result = yield* $(configProvider.load(config))
      assert.deepStrictEqual(result, ["value1", "value2"])
    }))

  it.effect("fromJson - should load configs from flat JSON", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        ConfigProvider.fromJson({
          host: "localhost",
          port: 8080
        }).load(hostPortConfig)
      )
      assert.deepStrictEqual(result, {
        host: "localhost",
        port: 8080
      })
    }))

  it.effect("fromJson - should load configs from nested JSON", () =>
    Effect.gen(function*($) {
      const result = yield* $(
        ConfigProvider.fromJson({
          hostPorts: [{
            host: "localhost",
            port: 8080
          }, {
            host: "localhost",
            port: 8080
          }, {
            host: "localhost",
            port: 8080
          }]
        }).load(hostPortsConfig)
      )
      assert.deepStrictEqual(result, {
        hostPorts: Array.from({ length: 3 }, () => ({ host: "localhost", port: 8080 }))
      })
    }))
})
