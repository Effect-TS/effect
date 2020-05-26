var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Entity, PrimaryColumn, Column } from "typeorm";
import { offsetStore } from "./read";
import * as T from "@matechs/core/Effect";
import * as O from "@matechs/core/Option";
import { pipe } from "@matechs/core/Pipe";
let TableOffset = /** @class */ (() => {
    let TableOffset = class TableOffset {
    };
    __decorate([
        PrimaryColumn({
            name: "id",
            type: "varying character"
        }),
        __metadata("design:type", String)
    ], TableOffset.prototype, "id", void 0);
    __decorate([
        Column({
            name: "offset",
            type: "bigint"
        }),
        __metadata("design:type", String)
    ], TableOffset.prototype, "offset", void 0);
    TableOffset = __decorate([
        Entity({
            name: "event_store_reads",
            synchronize: true
        })
    ], TableOffset);
    return TableOffset;
})();
export { TableOffset };
export const ormOffsetStore = (DB) => offsetStore({
    get: (readId, streamId) => pipe(DB.withRepositoryTask(TableOffset)((r) => () => r.findOne({ id: `${readId}-${streamId}` })), T.map(O.fromNullable), T.map(O.map((x) => BigInt(x.offset))), T.map(O.getOrElse(() => BigInt(0)))),
    set: (readId, streamId, offset) => T.asUnit(DB.withRepositoryTask(TableOffset)((r) => () => r.save({
        id: `${readId}-${streamId}`,
        offset: offset.toString(10)
    })))
});
