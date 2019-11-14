import * as E from "@matechs/effect";
import { HasEntityManager, orm, ormConfig, withRepository } from "../src";
import {
  ConnectionOptions,
  Entity,
  EntityManager,
  EntitySchema,
  FindOneOptions,
  ObjectID,
  PrimaryColumn,
  Repository
} from "typeorm";
import { pipe } from "fp-ts/lib/pipeable";
import * as assert from "assert";
import { left } from "fp-ts/lib/Either";
import { DemoEntity } from "./demo/DemoEntity";

describe("Orm", () => {
  it("should connect to database", async () => {
    const mockEntityManager: HasEntityManager = {
      orm: {
        manager: {
          getRepository<Entity>(
            target:
              | { new (): Entity }
              | Function
              | EntitySchema<Entity>
              | string
          ): Repository<Entity> {
            return {
              findOne(
                id?: string | number | Date | ObjectID,
                options?: FindOneOptions<Entity>
              ): Promise<Entity | undefined> {
                return Promise.reject("not implemented");
              }
            } as Repository<Entity>;
          }
        } as EntityManager
      }
    };

    const module = pipe(
      E.noEnv,
      E.mergeEnv(orm),
      E.mergeEnv(ormConfig({} as ConnectionOptions)),
      E.mergeEnv(mockEntityManager)
    );

    const program = withRepository(DemoEntity)(r => () =>
      r.findOne({ where: { id: "test" } })
    );

    const result = await E.run(E.provide(module)(program))();

    assert.deepEqual(result, left(new Error("not implemented")));
  });
});
