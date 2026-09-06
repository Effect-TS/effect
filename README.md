<!-- Use a static Shields badge because pkg.pr.new's dynamic badge times out while counting this repository's releases. -->

[![pkg.pr.new](https://img.shields.io/badge/pkg.pr.new-Effect--TS%2Feffect-black)](https://pkg.pr.new/~/Effect-TS/effect)

# Effect

Effect is a library for building robust, maintainable, type-safe, and production grade applications in TypeScript. It helps you handle the hard problems at scale: typed errors, dependency injection, structured concurrency, scheduling, tracing, and unified schema validation.

> **Effect V4 is currently a release candidate.** The `main` branch contains v4 development.

## Install V4 RC

```sh
npm install effect@rc
```

## Requirements

- **TypeScript 5.9 or newer.** TypeScript 7 is recommended for the best performance and compatibility with [Effect's TypeScript tooling](https://github.com/Effect-TS/tsgo#installation).
- **Node.js 18 or newer** is the general minimum for running Effect on Node.js. Some integration packages require newer runtimes; for example, `@effect/sql-sqlite-node` requires Node.js 22.16 or newer.
- **Strict type-checking:** the `strict` flag must be enabled in your `tsconfig.json`.

## Effect v3

The Effect v3 source code is available on the [`v3`](https://github.com/Effect-TS/effect/tree/v3) branch, which is also where issues and pull requests meant for Effect v3 should be targeted.

## Packages

This monorepo contains the core `effect` package alongside integration packages that extend it. All v4 packages are published under the `rc` tag on npm.

| Package                                                               | Description                                              | API Reference                                                      |
| --------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------ |
| [`effect`](packages/effect)                                           | The core package                                         | [docs](https://effect.website/docs/v4/api/effect)                  |
| [`@effect/platform-browser`](packages/platform/browser)               | Platform services for the browser                        | [docs](https://effect.website/docs/v4/api/platform-browser)        |
| [`@effect/platform-bun`](packages/platform/bun)                       | Platform services for [Bun](https://bun.sh)              | [docs](https://effect.website/docs/v4/api/platform-bun)            |
| [`@effect/platform-deno`](packages/platform/deno)                     | Platform services for [Deno](https://deno.com)           | [docs](https://effect.website/docs/v4/api/platform-deno)           |
| [`@effect/platform-node`](packages/platform/node)                     | Platform services for [Node.js](https://nodejs.org)      | [docs](https://effect.website/docs/v4/api/platform-node)           |
| [`@effect/platform-node-shared`](packages/platform/node-shared)       | Shared services for Node.js-compatible runtimes          | [docs](https://effect.website/docs/v4/api/platform-node-shared)    |
| [`@effect/sql-clickhouse`](packages/sql/clickhouse)                   | SQL client for [ClickHouse](https://clickhouse.com)      | [docs](https://effect.website/docs/v4/api/sql-clickhouse)          |
| [`@effect/sql-d1`](packages/sql/d1)                                   | SQL client for Cloudflare D1                             | [docs](https://effect.website/docs/v4/api/sql-d1)                  |
| [`@effect/sql-libsql`](packages/sql/libsql)                           | SQL client for libSQL                                    | [docs](https://effect.website/docs/v4/api/sql-libsql)              |
| [`@effect/sql-mssql`](packages/sql/mssql)                             | SQL client for Microsoft SQL Server                      | [docs](https://effect.website/docs/v4/api/sql-mssql)               |
| [`@effect/sql-mysql2`](packages/sql/mysql2)                           | SQL client for MySQL                                     | [docs](https://effect.website/docs/v4/api/sql-mysql2)              |
| [`@effect/sql-pg`](packages/sql/pg)                                   | SQL client for PostgreSQL                                | [docs](https://effect.website/docs/v4/api/sql-pg)                  |
| [`@effect/sql-pglite`](packages/sql/pglite)                           | SQL client for [PGlite](https://pglite.dev)              | [docs](https://effect.website/docs/v4/api/sql-pglite)              |
| [`@effect/sql-sqlite-bun`](packages/sql/sqlite-bun)                   | SQL client for SQLite via `bun:sqlite`                   | [docs](https://effect.website/docs/v4/api/sql-sqlite-bun)          |
| [`@effect/sql-sqlite-do`](packages/sql/sqlite-do)                     | SQL client for Cloudflare Durable Objects SQLite         | [docs](https://effect.website/docs/v4/api/sql-sqlite-do)           |
| [`@effect/sql-sqlite-node`](packages/sql/sqlite-node)                 | SQL client for SQLite via `node:sqlite`                  | [docs](https://effect.website/docs/v4/api/sql-sqlite-node)         |
| [`@effect/sql-sqlite-react-native`](packages/sql/sqlite-react-native) | SQL client for SQLite in React Native                    | [docs](https://effect.website/docs/v4/api/sql-sqlite-react-native) |
| [`@effect/sql-sqlite-wasm`](packages/sql/sqlite-wasm)                 | SQL client for SQLite compiled to WebAssembly            | [docs](https://effect.website/docs/v4/api/sql-sqlite-wasm)         |
| [`@effect/ai-anthropic`](packages/ai/anthropic)                       | Anthropic provider for the Effect AI modules             | [docs](https://effect.website/docs/v4/api/ai-anthropic)            |
| [`@effect/ai-openai`](packages/ai/openai)                             | OpenAI provider for the Effect AI modules                | [docs](https://effect.website/docs/v4/api/ai-openai)               |
| [`@effect/ai-openai-compat`](packages/ai/openai-compat)               | OpenAI-compatible API provider for the Effect AI modules | [docs](https://effect.website/docs/v4/api/ai-openai-compat)        |
| [`@effect/ai-openrouter`](packages/ai/openrouter)                     | OpenRouter provider for the Effect AI modules            | [docs](https://effect.website/docs/v4/api/ai-openrouter)           |
| [`@effect/atom-react`](packages/atom/react)                           | React bindings for Effect Atom                           | [docs](https://effect.website/docs/v4/api/atom-react)              |
| [`@effect/atom-solid`](packages/atom/solid)                           | SolidJS bindings for Effect Atom                         | [docs](https://effect.website/docs/v4/api/atom-solid)              |
| [`@effect/atom-vue`](packages/atom/vue)                               | Vue bindings for Effect Atom                             | [docs](https://effect.website/docs/v4/api/atom-vue)                |
| [`@effect/opentelemetry`](packages/opentelemetry)                     | [OpenTelemetry](https://opentelemetry.io) integration    | [docs](https://effect.website/docs/v4/api/opentelemetry)           |
| [`@effect/vitest`](packages/vitest)                                   | Helpers for testing with [Vitest](https://vitest.dev)    | [docs](https://effect.website/docs/v4/api/vitest)                  |
| [`@effect/docgen`](packages/tools/docgen)                             | Documentation generator for Effect projects              | [docs](https://effect.website/docs/v4/api/docgen)                  |
| [`@effect/doctest`](packages/tools/doctest)                           | Runs JSDoc examples as Vitest tests                      | [docs](https://effect.website/docs/v4/api/doctest)                 |
| [`@effect/openapi-generator`](packages/tools/openapi-generator)       | Generate Effect code from OpenAPI specifications         | [docs](https://effect.website/docs/v4/api/openapi-generator)       |

## Resources

- Documentation (https://effect.website)
- Discord (https://discord.gg/effect-ts)
- Effect v3 source (https://github.com/Effect-TS/effect/tree/v3)
- Effect v4 source (https://github.com/Effect-TS/effect/tree/main)

## License

MIT


## 🌐 Web Resources & Interactive Index
- [IDLE BANK](https://learnquesters.pages.dev/idle-bank.html)
- [WALL HOP](https://studyquests.github.io/wall-hop.html)
- [CATEGORY ONE BUTTON](https://studyquests.github.io/category-one-button.html)
- [CATEGORY BLOCK94](https://studyquests.github.io/category-block94.html)
- [CATEGORY CASUAL 6](https://studyquests.github.io/category-casual-6.html)
- [MATH MASTER](https://quizverses.github.io/math-master.html)
- [CATEGORY ADVENTURE 4](https://studyquests.github.io/category-adventure-4.html)
- [HEAD SOCCER ARENA](https://skillplay.github.io/head-soccer-arena.html)
- [TAPE SORT 3D](https://themindskillplayplay.pages.dev/tape-sort-3d.html)
- [HOOP RIVALS](https://quizverses.pages.dev/hoop-rivals.html)
- [CATEGORY BALL173](https://studyquests.github.io/category-ball173.html)
- [CATEGORY BUILDING](https://studyquests.github.io/category-building.html)
- [CATEGORY THINKY 2](https://studyquests.github.io/category-thinky-2.html)
- [HIDDEN OBJECTS VACATION IN BRAZIL](https://quizverses.pages.dev/hidden-objects-vacation-in-brazil.html)
- [FIGHTER STICK HERO](https://thequizzone.pages.dev/fighter-stick-hero.html)
- [ITALIAN BRAINROT JIGSAW](https://quizverses.github.io/italian-brainrot-jigsaw.html)
- [WOODS OF NEVIA FOREST SURVIVAL](https://quizverses.github.io/woods-of-nevia-forest-survival.html)
- [BASKET CHAMPS](https://thequizzone.pages.dev/basket-champs.html)
- [STICKER BOOK PUZZLE COLOR BY NUMBER](https://quizverses.github.io/sticker-book-puzzle-color-by-number.html)
- [POXEL IO](https://quizverses-9d2f2.web.app/poxel-io.html)
- [CATEGORY FPS 2](https://studyquests.github.io/category-fps-2.html)
- [COLOR BLOCK BLAST 3](https://theskillquest.pages.dev/color-block-blast-3.html)
- [EASY OBBY JUMP AND RUN CHALLENGE ONLINE](https://quizverses.github.io/easy-obby-jump-and-run-challenge-online.html)
- [CATEGORY CANNON22](https://iskillquest.pages.dev/category-cannon22.html)
- [TRICKY CASTLE](https://quizverses.github.io/tricky-castle.html)
- [SQUID GAME ORIGINAL](https://quizverses.github.io/squid-game-original.html)
- [2 PLAYER GAMES KIDS KITCHEN](https://quizverses.github.io/2-player-games-kids-kitchen.html)
- [JUNGLE MATCH ADVENTURES](https://themindplays.pages.dev/jungle-match-adventures.html)
- [CATEGORY MISSION207](https://themindplay.github.io/category-mission207.html)
- [CATEGORY DRESS UP97](https://quizverses.github.io/category-dress-up97.html)
- [SCHOOL SIMULATOR MY SCHOOL](https://themindzone.pages.dev/school-simulator-my-school.html)
- [TAP GO DELUXE](https://themindplay.pages.dev/tap-go-deluxe.html)
- [CATEGORY LIGHTSPEED FILTER](https://themindplay.pages.dev/category-lightspeed-filter.html)
- [CRYSTAL CONNECT](https://themindplay.pages.dev/crystal-connect.html)
- [CATEGORY PARTY23](https://theskillquest.pages.dev/category-party23.html)
- [OBBY HALLOWEEN DANGER SKATE](https://skillplay.github.io/obby-halloween-danger-skate.html)
- [CATEGORY AGILITY 2](https://quizverses.github.io/category-agility-2.html)
- [CATEGORY SKILL256](https://quizverses-9d2f2.web.app/category-skill256.html)
- [CIRCLE RUN ENDLESS](https://thequizzone.pages.dev/circle-run-endless.html)
- [FROGGA](https://skillplay.github.io/frogga.html)
- [CATEGORY ART](https://studyquests.github.io/category-art.html)
- [GAS STATION STICK SIMULATOR](https://themindzone.pages.dev/gas-station-stick-simulator.html)
- [SPRUNKI JIGSAW PUZZLE](https://themindzone.pages.dev/sprunki-jigsaw-puzzle.html)
- [ACCURATE 2D](https://skillplay.github.io/accurate-2d.html)
- [CATEGORY AVOID295](https://quizverses.github.io/category-avoid295.html)
- [TAP 3D BLOCKS](https://thequizzone.pages.dev/tap-3d-blocks.html)
- [WITCH FAIRY BFF](https://iskillquest.pages.dev/witch-fairy-bff.html)
- [SPIDER NOOB OBSTACLE COURSE](https://quizverses.github.io/spider-noob-obstacle-course.html)
- [TWO RX7 DRIFTERS](https://quizverses.github.io/two-rx7-drifters.html)
- [POGO MASTERS](https://iskillquest.pages.dev/pogo-masters.html)
- [CAT EVOLUTION](https://quizverses.pages.dev/cat-evolution.html)
- [COLOR BLOCK SORT](https://themindplays.pages.dev/color-block-sort.html)
- [STICKMAN PUNISHMENT](https://quizverses.pages.dev/stickman-punishment.html)
- [NUMBER MASTER RUN AND MERGE](https://thequizzone.pages.dev/number-master-run-and-merge.html)
- [CATEGORY ARENA254](https://studyquests.github.io/category-arena254.html)
- [CATEGORY ADVENTURE 4](https://quizverses.github.io/category-adventure-4.html)
- [CATEGORY IO](https://quizverses-9d2f2.web.app/category-io.html)
- [MEMORY LANE](https://themindplay.github.io/memory-lane.html)
- [CATEGORY BASKETBALL32](https://themindplay.github.io/category-basketball32.html)
- [AIRWAYS MAZE](https://themindplay.pages.dev/airways-maze.html)
- [TANK BATTLEIO](https://skillplay.github.io/tank-battleio.html)
- [CUT IN HALF](https://quizverses.github.io/cut-in-half.html)
- [CATEGORY CAT](https://studyquests.github.io/category-cat.html)
- [THATS NOT MY NEIGHBOR](https://quizverses.github.io/thats-not-my-neighbor.html)
- [SWORDSMAN ADVENTURE](https://skillplay.github.io/swordsman-adventure.html)
- [KIDS COLORING](https://quizverses.github.io/kids-coloring.html)
- [CATEGORY CAN T STOP PLAYING215](https://quizverses.github.io/category-can-t-stop-playing215.html)
- [DIAMONDZ](https://quizverses.pages.dev/diamondz.html)
- [CATEGORY AGILITY](https://quizverses.github.io/category-agility.html)
- [FEED ME MONSTERS IDLE BATTLE](https://themindskillplayplay.pages.dev/feed-me-monsters-idle-battle.html)
- [CATEGORY SIMULATION 4](https://theskillquest.pages.dev/category-simulation-4.html)
- [CATEGORY CANNON22](https://quizverses.github.io/category-cannon22.html)
- [CATEGORY CAN T STOP PLAYING212](https://quizverses-9d2f2.web.app/category-can-t-stop-playing212.html)
- [DOGE MATCH](https://thequizzone.pages.dev/doge-match.html)
- [COW JAM FARM PUZZLE](https://theskillquest.pages.dev/cow-jam-farm-puzzle.html)
- [CUTE FOLDING PAPER](https://skillplay.github.io/cute-folding-paper.html)
- [WORD SEARCH UNIVERSE ANIMALS](https://quizverses.github.io/word-search-universe-animals.html)
- [SKIBRONX RUNNER](https://quizverses.github.io/skibronx-runner.html)
- [TILE LIVING](https://quizverses.github.io/tile-living.html)
- [IDLE LEGEND](https://themindzone.pages.dev/idle-legend.html)
- [TEXAS HOLDEM POKER](https://themindplay.pages.dev/texas-holdem-poker.html)
- [CATEGORY UNBLOCKER](https://quizverses-9d2f2.web.app/category-unblocker.html)
- [CATEGORY ADVENTURE 2](https://quizverses.github.io/category-adventure-2.html)
- [KUZBASS HORROR](https://iskillquest.pages.dev/kuzbass-horror.html)
- [CATEGORY BATTLE 2](https://quizverses.github.io/category-battle-2.html)
- [DR PARKING](https://quizverses.pages.dev/dr-parking.html)
- [CATEGORY BALL175](https://studyquests.github.io/category-ball175.html)
- [SLAP AND RUN](https://quizverses.pages.dev/slap-and-run.html)
- [CATEGORY CAR376](https://themindplay.github.io/category-car376.html)
- [MOJICON SPRING CONNECT](https://theskillquest.pages.dev/mojicon-spring-connect.html)
- [INDEX3](https://quizverses.github.io/index3.html)
- [GEOMETRY TOWER DEFENSE](https://themindplays.pages.dev/geometry-tower-defense.html)
- [CATEGORY COOKING](https://studyquests.github.io/category-cooking.html)
- [CODEQUEST](https://themindzone.pages.dev/codequest.html)
- [MAGIC CHRISTMAS TREE MATCH 3](https://quizverses.github.io/magic-christmas-tree-match-3.html)
- [BASKET SWAP](https://skillplay.github.io/basket-swap.html)
- [NINE CARDS OF WINTER](https://thequizzone.pages.dev/nine-cards-of-winter.html)
- [LOVE CATS ROPE](https://themindzone.pages.dev/love-cats-rope.html)
- [GIN RUMMY](https://themindzone.pages.dev/gin-rummy.html)
- [INDEX17](https://themindplay.pages.dev/index17.html)
- [GREATSWORD V3](https://quizverses.pages.dev/greatsword-v3.html)
- [CATEGORY CASUAL 9](https://studyquests.github.io/category-casual-9.html)
- [ARROW PUZZLE](https://quizverses.github.io/arrow-puzzle.html)
- [LAST UFO DEFENSE](https://quizverses.github.io/last-ufo-defense.html)
- [HUNGRY NOOB CAFE SIMULATOR](https://learnquester.github.io/hungry-noob-cafe-simulator.html)
- [ARCADE ROPE](https://iskillplay.web.app/arcade-rope.html)
- [EASTER GLAMPING TRIP](https://thelearnquester.web.app/easter-glamping-trip.html)
- [GIRLFRIEND FROM HELL](https://quizverses.github.io/girlfriend-from-hell.html)
- [SPACEBAR CLICKER](https://quizverses.github.io/spacebar-clicker.html)
- [MR BOUNCE](https://quizverses.pages.dev/mr-bounce.html)
- [BUBBLE SHOOTER BUTTERFLY](https://themindskillplayplay.pages.dev/bubble-shooter-butterfly.html)
- [FASHION BATTLE FOR SURVIVAL](https://studyplaying.github.io/fashion-battle-for-survival.html)
- [CATEGORY LANSCHOOL](https://thelearnquester.web.app/category-lanschool.html)
- [BLOCK CRAFT 3D](https://iskillquest.pages.dev/block-craft-3d.html)
- [MY DINOSAUR LAND](https://studyplayings.pages.dev/my-dinosaur-land.html)
- [STICK WAR SAGA](https://thelearnquester.web.app/stick-war-saga.html)
- [CATEGORY SPORTS](https://quizverses-9d2f2.web.app/category-sports.html)
- [CHRISTMAS BLIND BOX](https://quizverses.github.io/christmas-blind-box.html)
- [COMBINATIONS DAILY](https://themindplay.pages.dev/combinations-daily.html)
- [INDEX16](https://themindplay.github.io/index16.html)
- [URBAN ASSAULT FORCE](https://learnquester.github.io/urban-assault-force.html)
- [UNPUZZLE MASTER](https://quizverses.pages.dev/unpuzzle-master.html)
- [CATEGORY STRATEGY](https://quizverses-9d2f2.web.app/category-strategy.html)
- [FLICK SHOT SOCCER](https://studyplaying.github.io/flick-shot-soccer.html)
- [TERMS](https://cryptotify.vercel.app/terms.html)
- [OBBY PUMP UP YOUR MUSCLES 1 PER SECOND](https://iskillplay.web.app/obby-pump-up-your-muscles-1-per-second.html)
- [PIXEL BLAST](https://iskillquest.pages.dev/pixel-blast.html)
- [STICKMAN ROGUE ONLINE](https://studyplaying.github.io/stickman-rogue-online.html)
- [INDEX21](https://skillplay.github.io/index21.html)
- [ROLLING BALLS SEA RACE](https://themindplay.pages.dev/rolling-balls-sea-race.html)
