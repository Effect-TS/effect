"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ormOffsetStore = exports.TableOffset = void 0;
var typeorm_1 = require("typeorm");
var read_1 = require("./read");
var T = __importStar(require("@matechs/core/Effect"));
var O = __importStar(require("@matechs/core/Option"));
var Pipe_1 = require("@matechs/core/Pipe");
var TableOffset = /** @class */ (function () {
    function TableOffset() {
    }
    __decorate([
        typeorm_1.PrimaryColumn({
            name: "id",
            type: "varying character"
        }),
        __metadata("design:type", String)
    ], TableOffset.prototype, "id", void 0);
    __decorate([
        typeorm_1.Column({
            name: "offset",
            type: "bigint"
        }),
        __metadata("design:type", String)
    ], TableOffset.prototype, "offset", void 0);
    TableOffset = __decorate([
        typeorm_1.Entity({
            name: "event_store_reads",
            synchronize: true
        })
    ], TableOffset);
    return TableOffset;
}());
exports.TableOffset = TableOffset;
exports.ormOffsetStore = function (DB) {
    return read_1.offsetStore({
        get: function (readId, streamId) {
            return Pipe_1.pipe(DB.withRepositoryTask(TableOffset)(function (r) { return function () {
                return r.findOne({ id: readId + "-" + streamId });
            }; }), T.map(O.fromNullable), T.map(O.map(function (x) { return BigInt(x.offset); })), T.map(O.getOrElse(function () { return BigInt(0); })));
        },
        set: function (readId, streamId, offset) {
            return T.asUnit(DB.withRepositoryTask(TableOffset)(function (r) { return function () {
                return r.save({
                    id: readId + "-" + streamId,
                    offset: offset.toString(10)
                });
            }; }));
        }
    });
};
