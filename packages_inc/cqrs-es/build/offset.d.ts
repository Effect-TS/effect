import { DbT } from "@matechs/orm"
export declare class TableOffset {
  id: string
  offset: string
}
export declare const ormOffsetStore: <Db extends string | symbol>(
  DB: DbT<Db>
) => import("./read").OffsetStore<
  unknown,
  unknown,
  import("../../../packages_be/orm/build").ORM<Db>,
  import("../../../packages_be/orm/build").TaskError,
  import("../../../packages_be/orm/build").ORM<Db>,
  import("../../../packages_be/orm/build").TaskError
>
