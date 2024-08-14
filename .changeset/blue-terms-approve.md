---
"@effect/sql": patch
---

add Model module to /sql

The `Model` module can be used to create domain schemas with common variants for
the database and serializing to JSON.

```ts
import { Schema } from "@effect/schema";
import { Model } from "@effect/sql";

export const GroupId = Schema.Number.pipe(Schema.brand("GroupId"));

export class Group extends Model.Class<Group>("Group")({
  id: Model.Generated(GroupId),
  name: Schema.NonEmptyTrimmedString,
  createdAt: Model.DateTimeInsertFromDate,
  updatedAt: Model.DateTimeUpdateFromDate,
}) {}

// schema used for selects
Group;

// schema used for inserts
Group.insert;

// schema used for updates
Group.update;

// schema used for json api
Group.json;
Group.jsonCreate;
Group.jsonUpdate;

// you can also turn them into classes
class GroupJson extends Schema.Class<GroupJson>("GroupJson")(Group.json) {
  get upperName() {
    return this.name.toUpperCase();
  }
}
```
