// Measures 100 Author/Book selection pairs declared as Schema.Opaque classes, the current @effect/graphql-generator shape.
import * as Schema from "effect/Schema"

Schema.String

export class Author001 extends Schema.Opaque<Author001>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book001 extends Schema.Opaque<Book001>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author001),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook001 = Schema.decodeUnknownEffect(Book001)
export const readBook001 = (book: typeof Book001.Type) => book.author?.name ?? book.title

export class Author002 extends Schema.Opaque<Author002>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book002 extends Schema.Opaque<Book002>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author002),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook002 = Schema.decodeUnknownEffect(Book002)
export const readBook002 = (book: typeof Book002.Type) => book.author?.name ?? book.title

export class Author003 extends Schema.Opaque<Author003>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book003 extends Schema.Opaque<Book003>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author003),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook003 = Schema.decodeUnknownEffect(Book003)
export const readBook003 = (book: typeof Book003.Type) => book.author?.name ?? book.title

export class Author004 extends Schema.Opaque<Author004>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book004 extends Schema.Opaque<Book004>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author004),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook004 = Schema.decodeUnknownEffect(Book004)
export const readBook004 = (book: typeof Book004.Type) => book.author?.name ?? book.title

export class Author005 extends Schema.Opaque<Author005>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book005 extends Schema.Opaque<Book005>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author005),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook005 = Schema.decodeUnknownEffect(Book005)
export const readBook005 = (book: typeof Book005.Type) => book.author?.name ?? book.title

export class Author006 extends Schema.Opaque<Author006>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book006 extends Schema.Opaque<Book006>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author006),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook006 = Schema.decodeUnknownEffect(Book006)
export const readBook006 = (book: typeof Book006.Type) => book.author?.name ?? book.title

export class Author007 extends Schema.Opaque<Author007>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book007 extends Schema.Opaque<Book007>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author007),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook007 = Schema.decodeUnknownEffect(Book007)
export const readBook007 = (book: typeof Book007.Type) => book.author?.name ?? book.title

export class Author008 extends Schema.Opaque<Author008>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book008 extends Schema.Opaque<Book008>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author008),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook008 = Schema.decodeUnknownEffect(Book008)
export const readBook008 = (book: typeof Book008.Type) => book.author?.name ?? book.title

export class Author009 extends Schema.Opaque<Author009>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book009 extends Schema.Opaque<Book009>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author009),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook009 = Schema.decodeUnknownEffect(Book009)
export const readBook009 = (book: typeof Book009.Type) => book.author?.name ?? book.title

export class Author010 extends Schema.Opaque<Author010>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book010 extends Schema.Opaque<Book010>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author010),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook010 = Schema.decodeUnknownEffect(Book010)
export const readBook010 = (book: typeof Book010.Type) => book.author?.name ?? book.title

export class Author011 extends Schema.Opaque<Author011>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book011 extends Schema.Opaque<Book011>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author011),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook011 = Schema.decodeUnknownEffect(Book011)
export const readBook011 = (book: typeof Book011.Type) => book.author?.name ?? book.title

export class Author012 extends Schema.Opaque<Author012>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book012 extends Schema.Opaque<Book012>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author012),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook012 = Schema.decodeUnknownEffect(Book012)
export const readBook012 = (book: typeof Book012.Type) => book.author?.name ?? book.title

export class Author013 extends Schema.Opaque<Author013>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book013 extends Schema.Opaque<Book013>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author013),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook013 = Schema.decodeUnknownEffect(Book013)
export const readBook013 = (book: typeof Book013.Type) => book.author?.name ?? book.title

export class Author014 extends Schema.Opaque<Author014>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book014 extends Schema.Opaque<Book014>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author014),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook014 = Schema.decodeUnknownEffect(Book014)
export const readBook014 = (book: typeof Book014.Type) => book.author?.name ?? book.title

export class Author015 extends Schema.Opaque<Author015>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book015 extends Schema.Opaque<Book015>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author015),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook015 = Schema.decodeUnknownEffect(Book015)
export const readBook015 = (book: typeof Book015.Type) => book.author?.name ?? book.title

export class Author016 extends Schema.Opaque<Author016>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book016 extends Schema.Opaque<Book016>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author016),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook016 = Schema.decodeUnknownEffect(Book016)
export const readBook016 = (book: typeof Book016.Type) => book.author?.name ?? book.title

export class Author017 extends Schema.Opaque<Author017>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book017 extends Schema.Opaque<Book017>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author017),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook017 = Schema.decodeUnknownEffect(Book017)
export const readBook017 = (book: typeof Book017.Type) => book.author?.name ?? book.title

export class Author018 extends Schema.Opaque<Author018>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book018 extends Schema.Opaque<Book018>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author018),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook018 = Schema.decodeUnknownEffect(Book018)
export const readBook018 = (book: typeof Book018.Type) => book.author?.name ?? book.title

export class Author019 extends Schema.Opaque<Author019>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book019 extends Schema.Opaque<Book019>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author019),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook019 = Schema.decodeUnknownEffect(Book019)
export const readBook019 = (book: typeof Book019.Type) => book.author?.name ?? book.title

export class Author020 extends Schema.Opaque<Author020>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book020 extends Schema.Opaque<Book020>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author020),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook020 = Schema.decodeUnknownEffect(Book020)
export const readBook020 = (book: typeof Book020.Type) => book.author?.name ?? book.title

export class Author021 extends Schema.Opaque<Author021>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book021 extends Schema.Opaque<Book021>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author021),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook021 = Schema.decodeUnknownEffect(Book021)
export const readBook021 = (book: typeof Book021.Type) => book.author?.name ?? book.title

export class Author022 extends Schema.Opaque<Author022>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book022 extends Schema.Opaque<Book022>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author022),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook022 = Schema.decodeUnknownEffect(Book022)
export const readBook022 = (book: typeof Book022.Type) => book.author?.name ?? book.title

export class Author023 extends Schema.Opaque<Author023>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book023 extends Schema.Opaque<Book023>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author023),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook023 = Schema.decodeUnknownEffect(Book023)
export const readBook023 = (book: typeof Book023.Type) => book.author?.name ?? book.title

export class Author024 extends Schema.Opaque<Author024>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book024 extends Schema.Opaque<Book024>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author024),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook024 = Schema.decodeUnknownEffect(Book024)
export const readBook024 = (book: typeof Book024.Type) => book.author?.name ?? book.title

export class Author025 extends Schema.Opaque<Author025>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book025 extends Schema.Opaque<Book025>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author025),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook025 = Schema.decodeUnknownEffect(Book025)
export const readBook025 = (book: typeof Book025.Type) => book.author?.name ?? book.title

export class Author026 extends Schema.Opaque<Author026>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book026 extends Schema.Opaque<Book026>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author026),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook026 = Schema.decodeUnknownEffect(Book026)
export const readBook026 = (book: typeof Book026.Type) => book.author?.name ?? book.title

export class Author027 extends Schema.Opaque<Author027>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book027 extends Schema.Opaque<Book027>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author027),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook027 = Schema.decodeUnknownEffect(Book027)
export const readBook027 = (book: typeof Book027.Type) => book.author?.name ?? book.title

export class Author028 extends Schema.Opaque<Author028>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book028 extends Schema.Opaque<Book028>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author028),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook028 = Schema.decodeUnknownEffect(Book028)
export const readBook028 = (book: typeof Book028.Type) => book.author?.name ?? book.title

export class Author029 extends Schema.Opaque<Author029>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book029 extends Schema.Opaque<Book029>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author029),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook029 = Schema.decodeUnknownEffect(Book029)
export const readBook029 = (book: typeof Book029.Type) => book.author?.name ?? book.title

export class Author030 extends Schema.Opaque<Author030>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book030 extends Schema.Opaque<Book030>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author030),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook030 = Schema.decodeUnknownEffect(Book030)
export const readBook030 = (book: typeof Book030.Type) => book.author?.name ?? book.title

export class Author031 extends Schema.Opaque<Author031>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book031 extends Schema.Opaque<Book031>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author031),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook031 = Schema.decodeUnknownEffect(Book031)
export const readBook031 = (book: typeof Book031.Type) => book.author?.name ?? book.title

export class Author032 extends Schema.Opaque<Author032>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book032 extends Schema.Opaque<Book032>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author032),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook032 = Schema.decodeUnknownEffect(Book032)
export const readBook032 = (book: typeof Book032.Type) => book.author?.name ?? book.title

export class Author033 extends Schema.Opaque<Author033>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book033 extends Schema.Opaque<Book033>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author033),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook033 = Schema.decodeUnknownEffect(Book033)
export const readBook033 = (book: typeof Book033.Type) => book.author?.name ?? book.title

export class Author034 extends Schema.Opaque<Author034>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book034 extends Schema.Opaque<Book034>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author034),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook034 = Schema.decodeUnknownEffect(Book034)
export const readBook034 = (book: typeof Book034.Type) => book.author?.name ?? book.title

export class Author035 extends Schema.Opaque<Author035>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book035 extends Schema.Opaque<Book035>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author035),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook035 = Schema.decodeUnknownEffect(Book035)
export const readBook035 = (book: typeof Book035.Type) => book.author?.name ?? book.title

export class Author036 extends Schema.Opaque<Author036>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book036 extends Schema.Opaque<Book036>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author036),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook036 = Schema.decodeUnknownEffect(Book036)
export const readBook036 = (book: typeof Book036.Type) => book.author?.name ?? book.title

export class Author037 extends Schema.Opaque<Author037>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book037 extends Schema.Opaque<Book037>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author037),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook037 = Schema.decodeUnknownEffect(Book037)
export const readBook037 = (book: typeof Book037.Type) => book.author?.name ?? book.title

export class Author038 extends Schema.Opaque<Author038>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book038 extends Schema.Opaque<Book038>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author038),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook038 = Schema.decodeUnknownEffect(Book038)
export const readBook038 = (book: typeof Book038.Type) => book.author?.name ?? book.title

export class Author039 extends Schema.Opaque<Author039>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book039 extends Schema.Opaque<Book039>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author039),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook039 = Schema.decodeUnknownEffect(Book039)
export const readBook039 = (book: typeof Book039.Type) => book.author?.name ?? book.title

export class Author040 extends Schema.Opaque<Author040>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book040 extends Schema.Opaque<Book040>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author040),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook040 = Schema.decodeUnknownEffect(Book040)
export const readBook040 = (book: typeof Book040.Type) => book.author?.name ?? book.title

export class Author041 extends Schema.Opaque<Author041>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book041 extends Schema.Opaque<Book041>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author041),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook041 = Schema.decodeUnknownEffect(Book041)
export const readBook041 = (book: typeof Book041.Type) => book.author?.name ?? book.title

export class Author042 extends Schema.Opaque<Author042>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book042 extends Schema.Opaque<Book042>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author042),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook042 = Schema.decodeUnknownEffect(Book042)
export const readBook042 = (book: typeof Book042.Type) => book.author?.name ?? book.title

export class Author043 extends Schema.Opaque<Author043>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book043 extends Schema.Opaque<Book043>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author043),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook043 = Schema.decodeUnknownEffect(Book043)
export const readBook043 = (book: typeof Book043.Type) => book.author?.name ?? book.title

export class Author044 extends Schema.Opaque<Author044>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book044 extends Schema.Opaque<Book044>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author044),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook044 = Schema.decodeUnknownEffect(Book044)
export const readBook044 = (book: typeof Book044.Type) => book.author?.name ?? book.title

export class Author045 extends Schema.Opaque<Author045>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book045 extends Schema.Opaque<Book045>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author045),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook045 = Schema.decodeUnknownEffect(Book045)
export const readBook045 = (book: typeof Book045.Type) => book.author?.name ?? book.title

export class Author046 extends Schema.Opaque<Author046>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book046 extends Schema.Opaque<Book046>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author046),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook046 = Schema.decodeUnknownEffect(Book046)
export const readBook046 = (book: typeof Book046.Type) => book.author?.name ?? book.title

export class Author047 extends Schema.Opaque<Author047>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book047 extends Schema.Opaque<Book047>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author047),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook047 = Schema.decodeUnknownEffect(Book047)
export const readBook047 = (book: typeof Book047.Type) => book.author?.name ?? book.title

export class Author048 extends Schema.Opaque<Author048>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book048 extends Schema.Opaque<Book048>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author048),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook048 = Schema.decodeUnknownEffect(Book048)
export const readBook048 = (book: typeof Book048.Type) => book.author?.name ?? book.title

export class Author049 extends Schema.Opaque<Author049>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book049 extends Schema.Opaque<Book049>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author049),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook049 = Schema.decodeUnknownEffect(Book049)
export const readBook049 = (book: typeof Book049.Type) => book.author?.name ?? book.title

export class Author050 extends Schema.Opaque<Author050>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book050 extends Schema.Opaque<Book050>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author050),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook050 = Schema.decodeUnknownEffect(Book050)
export const readBook050 = (book: typeof Book050.Type) => book.author?.name ?? book.title

export class Author051 extends Schema.Opaque<Author051>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book051 extends Schema.Opaque<Book051>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author051),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook051 = Schema.decodeUnknownEffect(Book051)
export const readBook051 = (book: typeof Book051.Type) => book.author?.name ?? book.title

export class Author052 extends Schema.Opaque<Author052>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book052 extends Schema.Opaque<Book052>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author052),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook052 = Schema.decodeUnknownEffect(Book052)
export const readBook052 = (book: typeof Book052.Type) => book.author?.name ?? book.title

export class Author053 extends Schema.Opaque<Author053>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book053 extends Schema.Opaque<Book053>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author053),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook053 = Schema.decodeUnknownEffect(Book053)
export const readBook053 = (book: typeof Book053.Type) => book.author?.name ?? book.title

export class Author054 extends Schema.Opaque<Author054>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book054 extends Schema.Opaque<Book054>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author054),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook054 = Schema.decodeUnknownEffect(Book054)
export const readBook054 = (book: typeof Book054.Type) => book.author?.name ?? book.title

export class Author055 extends Schema.Opaque<Author055>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book055 extends Schema.Opaque<Book055>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author055),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook055 = Schema.decodeUnknownEffect(Book055)
export const readBook055 = (book: typeof Book055.Type) => book.author?.name ?? book.title

export class Author056 extends Schema.Opaque<Author056>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book056 extends Schema.Opaque<Book056>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author056),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook056 = Schema.decodeUnknownEffect(Book056)
export const readBook056 = (book: typeof Book056.Type) => book.author?.name ?? book.title

export class Author057 extends Schema.Opaque<Author057>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book057 extends Schema.Opaque<Book057>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author057),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook057 = Schema.decodeUnknownEffect(Book057)
export const readBook057 = (book: typeof Book057.Type) => book.author?.name ?? book.title

export class Author058 extends Schema.Opaque<Author058>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book058 extends Schema.Opaque<Book058>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author058),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook058 = Schema.decodeUnknownEffect(Book058)
export const readBook058 = (book: typeof Book058.Type) => book.author?.name ?? book.title

export class Author059 extends Schema.Opaque<Author059>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book059 extends Schema.Opaque<Book059>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author059),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook059 = Schema.decodeUnknownEffect(Book059)
export const readBook059 = (book: typeof Book059.Type) => book.author?.name ?? book.title

export class Author060 extends Schema.Opaque<Author060>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book060 extends Schema.Opaque<Book060>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author060),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook060 = Schema.decodeUnknownEffect(Book060)
export const readBook060 = (book: typeof Book060.Type) => book.author?.name ?? book.title

export class Author061 extends Schema.Opaque<Author061>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book061 extends Schema.Opaque<Book061>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author061),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook061 = Schema.decodeUnknownEffect(Book061)
export const readBook061 = (book: typeof Book061.Type) => book.author?.name ?? book.title

export class Author062 extends Schema.Opaque<Author062>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book062 extends Schema.Opaque<Book062>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author062),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook062 = Schema.decodeUnknownEffect(Book062)
export const readBook062 = (book: typeof Book062.Type) => book.author?.name ?? book.title

export class Author063 extends Schema.Opaque<Author063>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book063 extends Schema.Opaque<Book063>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author063),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook063 = Schema.decodeUnknownEffect(Book063)
export const readBook063 = (book: typeof Book063.Type) => book.author?.name ?? book.title

export class Author064 extends Schema.Opaque<Author064>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book064 extends Schema.Opaque<Book064>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author064),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook064 = Schema.decodeUnknownEffect(Book064)
export const readBook064 = (book: typeof Book064.Type) => book.author?.name ?? book.title

export class Author065 extends Schema.Opaque<Author065>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book065 extends Schema.Opaque<Book065>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author065),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook065 = Schema.decodeUnknownEffect(Book065)
export const readBook065 = (book: typeof Book065.Type) => book.author?.name ?? book.title

export class Author066 extends Schema.Opaque<Author066>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book066 extends Schema.Opaque<Book066>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author066),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook066 = Schema.decodeUnknownEffect(Book066)
export const readBook066 = (book: typeof Book066.Type) => book.author?.name ?? book.title

export class Author067 extends Schema.Opaque<Author067>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book067 extends Schema.Opaque<Book067>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author067),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook067 = Schema.decodeUnknownEffect(Book067)
export const readBook067 = (book: typeof Book067.Type) => book.author?.name ?? book.title

export class Author068 extends Schema.Opaque<Author068>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book068 extends Schema.Opaque<Book068>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author068),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook068 = Schema.decodeUnknownEffect(Book068)
export const readBook068 = (book: typeof Book068.Type) => book.author?.name ?? book.title

export class Author069 extends Schema.Opaque<Author069>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book069 extends Schema.Opaque<Book069>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author069),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook069 = Schema.decodeUnknownEffect(Book069)
export const readBook069 = (book: typeof Book069.Type) => book.author?.name ?? book.title

export class Author070 extends Schema.Opaque<Author070>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book070 extends Schema.Opaque<Book070>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author070),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook070 = Schema.decodeUnknownEffect(Book070)
export const readBook070 = (book: typeof Book070.Type) => book.author?.name ?? book.title

export class Author071 extends Schema.Opaque<Author071>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book071 extends Schema.Opaque<Book071>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author071),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook071 = Schema.decodeUnknownEffect(Book071)
export const readBook071 = (book: typeof Book071.Type) => book.author?.name ?? book.title

export class Author072 extends Schema.Opaque<Author072>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book072 extends Schema.Opaque<Book072>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author072),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook072 = Schema.decodeUnknownEffect(Book072)
export const readBook072 = (book: typeof Book072.Type) => book.author?.name ?? book.title

export class Author073 extends Schema.Opaque<Author073>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book073 extends Schema.Opaque<Book073>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author073),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook073 = Schema.decodeUnknownEffect(Book073)
export const readBook073 = (book: typeof Book073.Type) => book.author?.name ?? book.title

export class Author074 extends Schema.Opaque<Author074>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book074 extends Schema.Opaque<Book074>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author074),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook074 = Schema.decodeUnknownEffect(Book074)
export const readBook074 = (book: typeof Book074.Type) => book.author?.name ?? book.title

export class Author075 extends Schema.Opaque<Author075>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book075 extends Schema.Opaque<Book075>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author075),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook075 = Schema.decodeUnknownEffect(Book075)
export const readBook075 = (book: typeof Book075.Type) => book.author?.name ?? book.title

export class Author076 extends Schema.Opaque<Author076>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book076 extends Schema.Opaque<Book076>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author076),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook076 = Schema.decodeUnknownEffect(Book076)
export const readBook076 = (book: typeof Book076.Type) => book.author?.name ?? book.title

export class Author077 extends Schema.Opaque<Author077>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book077 extends Schema.Opaque<Book077>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author077),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook077 = Schema.decodeUnknownEffect(Book077)
export const readBook077 = (book: typeof Book077.Type) => book.author?.name ?? book.title

export class Author078 extends Schema.Opaque<Author078>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book078 extends Schema.Opaque<Book078>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author078),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook078 = Schema.decodeUnknownEffect(Book078)
export const readBook078 = (book: typeof Book078.Type) => book.author?.name ?? book.title

export class Author079 extends Schema.Opaque<Author079>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book079 extends Schema.Opaque<Book079>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author079),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook079 = Schema.decodeUnknownEffect(Book079)
export const readBook079 = (book: typeof Book079.Type) => book.author?.name ?? book.title

export class Author080 extends Schema.Opaque<Author080>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book080 extends Schema.Opaque<Book080>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author080),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook080 = Schema.decodeUnknownEffect(Book080)
export const readBook080 = (book: typeof Book080.Type) => book.author?.name ?? book.title

export class Author081 extends Schema.Opaque<Author081>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book081 extends Schema.Opaque<Book081>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author081),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook081 = Schema.decodeUnknownEffect(Book081)
export const readBook081 = (book: typeof Book081.Type) => book.author?.name ?? book.title

export class Author082 extends Schema.Opaque<Author082>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book082 extends Schema.Opaque<Book082>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author082),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook082 = Schema.decodeUnknownEffect(Book082)
export const readBook082 = (book: typeof Book082.Type) => book.author?.name ?? book.title

export class Author083 extends Schema.Opaque<Author083>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book083 extends Schema.Opaque<Book083>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author083),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook083 = Schema.decodeUnknownEffect(Book083)
export const readBook083 = (book: typeof Book083.Type) => book.author?.name ?? book.title

export class Author084 extends Schema.Opaque<Author084>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book084 extends Schema.Opaque<Book084>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author084),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook084 = Schema.decodeUnknownEffect(Book084)
export const readBook084 = (book: typeof Book084.Type) => book.author?.name ?? book.title

export class Author085 extends Schema.Opaque<Author085>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book085 extends Schema.Opaque<Book085>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author085),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook085 = Schema.decodeUnknownEffect(Book085)
export const readBook085 = (book: typeof Book085.Type) => book.author?.name ?? book.title

export class Author086 extends Schema.Opaque<Author086>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book086 extends Schema.Opaque<Book086>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author086),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook086 = Schema.decodeUnknownEffect(Book086)
export const readBook086 = (book: typeof Book086.Type) => book.author?.name ?? book.title

export class Author087 extends Schema.Opaque<Author087>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book087 extends Schema.Opaque<Book087>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author087),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook087 = Schema.decodeUnknownEffect(Book087)
export const readBook087 = (book: typeof Book087.Type) => book.author?.name ?? book.title

export class Author088 extends Schema.Opaque<Author088>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book088 extends Schema.Opaque<Book088>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author088),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook088 = Schema.decodeUnknownEffect(Book088)
export const readBook088 = (book: typeof Book088.Type) => book.author?.name ?? book.title

export class Author089 extends Schema.Opaque<Author089>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book089 extends Schema.Opaque<Book089>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author089),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook089 = Schema.decodeUnknownEffect(Book089)
export const readBook089 = (book: typeof Book089.Type) => book.author?.name ?? book.title

export class Author090 extends Schema.Opaque<Author090>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book090 extends Schema.Opaque<Book090>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author090),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook090 = Schema.decodeUnknownEffect(Book090)
export const readBook090 = (book: typeof Book090.Type) => book.author?.name ?? book.title

export class Author091 extends Schema.Opaque<Author091>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book091 extends Schema.Opaque<Book091>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author091),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook091 = Schema.decodeUnknownEffect(Book091)
export const readBook091 = (book: typeof Book091.Type) => book.author?.name ?? book.title

export class Author092 extends Schema.Opaque<Author092>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book092 extends Schema.Opaque<Book092>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author092),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook092 = Schema.decodeUnknownEffect(Book092)
export const readBook092 = (book: typeof Book092.Type) => book.author?.name ?? book.title

export class Author093 extends Schema.Opaque<Author093>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book093 extends Schema.Opaque<Book093>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author093),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook093 = Schema.decodeUnknownEffect(Book093)
export const readBook093 = (book: typeof Book093.Type) => book.author?.name ?? book.title

export class Author094 extends Schema.Opaque<Author094>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book094 extends Schema.Opaque<Book094>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author094),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook094 = Schema.decodeUnknownEffect(Book094)
export const readBook094 = (book: typeof Book094.Type) => book.author?.name ?? book.title

export class Author095 extends Schema.Opaque<Author095>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book095 extends Schema.Opaque<Book095>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author095),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook095 = Schema.decodeUnknownEffect(Book095)
export const readBook095 = (book: typeof Book095.Type) => book.author?.name ?? book.title

export class Author096 extends Schema.Opaque<Author096>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book096 extends Schema.Opaque<Book096>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author096),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook096 = Schema.decodeUnknownEffect(Book096)
export const readBook096 = (book: typeof Book096.Type) => book.author?.name ?? book.title

export class Author097 extends Schema.Opaque<Author097>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book097 extends Schema.Opaque<Book097>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author097),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook097 = Schema.decodeUnknownEffect(Book097)
export const readBook097 = (book: typeof Book097.Type) => book.author?.name ?? book.title

export class Author098 extends Schema.Opaque<Author098>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book098 extends Schema.Opaque<Book098>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author098),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook098 = Schema.decodeUnknownEffect(Book098)
export const readBook098 = (book: typeof Book098.Type) => book.author?.name ?? book.title

export class Author099 extends Schema.Opaque<Author099>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book099 extends Schema.Opaque<Book099>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author099),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook099 = Schema.decodeUnknownEffect(Book099)
export const readBook099 = (book: typeof Book099.Type) => book.author?.name ?? book.title

export class Author100 extends Schema.Opaque<Author100>()(Schema.Struct({
  name: Schema.NullOr(Schema.String),
  born: Schema.NullOr(Schema.Number)
})) {}

export class Book100 extends Schema.Opaque<Book100>()(Schema.Struct({
  title: Schema.NullOr(Schema.String),
  isbn: Schema.String,
  pages: Schema.NullOr(Schema.Number),
  author: Schema.NullOr(Author100),
  tags: Schema.NullOr(Schema.Array(Schema.NullOr(Schema.String)))
})) {}

export const decodeBook100 = Schema.decodeUnknownEffect(Book100)
export const readBook100 = (book: typeof Book100.Type) => book.author?.name ?? book.title
