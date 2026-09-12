/*
 * Collation mapping tables adapted from tedious/src/collation.ts.
 *
 * The MIT License
 *
 * Copyright (c) 2010-2018 Mike D Pilsbury
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
type Encoding =
  | "utf-8"
  | "CP437"
  | "CP850"
  | "CP874"
  | "CP932"
  | "CP936"
  | "CP949"
  | "CP950"
  | "CP1250"
  | "CP1251"
  | "CP1252"
  | "CP1253"
  | "CP1254"
  | "CP1255"
  | "CP1256"
  | "CP1257"
  | "CP1258"

// http://technet.microsoft.com/en-us/library/aa176553(v=sql.80).aspx
export const codepageByLanguageId: { [key: number]: Encoding } = {
  // Arabic_*
  [0x0401]: "CP1256",

  // Chinese_Taiwan_Stroke_*
  // Chinese_Traditional_Stroke_Count_*
  // Chinese_Taiwan_Bopomofo_*
  // Chinese_Traditional_Bopomofo_*
  [0x0404]: "CP950",

  // Czech_*
  [0x0405]: "CP1250",

  // Danish_Greenlandic_*
  // Danish_Norwegian_*
  [0x0406]: "CP1252",

  // Greek_*
  [0x0408]: "CP1253",

  // Latin1_General_*
  [0x0409]: "CP1252",

  // Traditional_Spanish_*
  [0x040A]: "CP1252",

  // Finnish_Swedish_*
  [0x040B]: "CP1252",

  // French_*
  [0x040C]: "CP1252",

  // Hebrew_*
  [0x040D]: "CP1255",

  // Hungarian_*
  // Hungarian_Technical_*
  [0x040E]: "CP1250",

  // Icelandic_*
  [0x040F]: "CP1252",

  // Japanese_*
  // Japanese_XJIS_*
  // Japanese_Unicode_*
  // Japanese_Bushu_Kakusu_*
  [0x0411]: "CP932",

  // Korean_*
  // Korean_Wansung_*
  [0x0412]: "CP949",

  // Norwegian_*
  [0x0414]: "CP1252",

  // Polish_*
  [0x0415]: "CP1250",

  // Romansh_*
  [0x0417]: "CP1252",

  // Romanian_*
  [0x0418]: "CP1250",

  // Cyrillic_*
  [0x0419]: "CP1251",

  // Croatian_*
  [0x041A]: "CP1250",

  // Slovak_*
  [0x041B]: "CP1250",

  // Albanian_*
  [0x041C]: "CP1250",

  // Thai_*
  [0x041E]: "CP874",

  // Turkish_*
  [0x041F]: "CP1254",

  // Urdu_*
  [0x0420]: "CP1256",

  // Ukrainian_*
  [0x0422]: "CP1251",

  // Slovenian_*
  [0x0424]: "CP1250",

  // Estonian_*
  [0x0425]: "CP1257",

  // Latvian_*
  [0x0426]: "CP1257",

  // Lithuanian_*
  [0x0427]: "CP1257",

  // Persian_*
  [0x0429]: "CP1256",

  // Vietnamese_*
  [0x042A]: "CP1258",

  // Azeri_Latin_*
  [0x042C]: "CP1254",

  // Upper_Sorbian_*
  [0x042E]: "CP1252",

  // Macedonian_FYROM_*
  [0x042F]: "CP1251",

  // Sami_Norway_*
  [0x043B]: "CP1252",

  // Kazakh_*
  [0x043F]: "CP1251",

  // Turkmen_*
  [0x0442]: "CP1250",

  // Uzbek_Latin_*
  [0x0443]: "CP1254",

  // Tatar_*
  [0x0444]: "CP1251",

  // Welsh_*
  [0x0452]: "CP1252",

  // Frisian_*
  [0x0462]: "CP1252",

  // Bashkir_*
  [0x046D]: "CP1251",

  // Mapudungan_*
  [0x047A]: "CP1252",

  // Mohawk_*
  [0x047C]: "CP1252",

  // Breton_*
  [0x047E]: "CP1252",

  // Uighur_*
  [0x0480]: "CP1256",

  // Corsican_*
  [0x0483]: "CP1252",

  // Yakut_*
  [0x0485]: "CP1251",

  // Dari_*
  [0x048C]: "CP1256",

  // Chinese_PRC_*
  // Chinese_Simplified_Pinyin_*
  // Chinese_PRC_Stroke_*
  // Chinese_Simplified_Stroke_Order_*
  [0x0804]: "CP936",

  // Serbian_Latin_*
  [0x081A]: "CP1250",

  // Azeri_Cyrillic_*
  [0x082C]: "CP1251",

  // Sami_Sweden_Finland_*
  [0x083B]: "CP1252",

  // Tamazight_*
  [0x085F]: "CP1252",

  // Chinese_Hong_Kong_Stroke_*
  [0x0C04]: "CP950",

  // Modern_Spanish_*
  [0x0C0A]: "CP1252",

  // Serbian_Cyrillic_*
  [0x0C1A]: "CP1251",

  // Chinese_Traditional_Pinyin_*
  // Chinese_Traditional_Stroke_Order_*
  [0x1404]: "CP950",

  // Bosnian_Latin_*
  [0x141A]: "CP1250",

  // Bosnian_Cyrillic_*
  [0x201A]: "CP1251",

  // German
  // German_PhoneBook_*
  [0x0407]: "CP1252",

  // Georgian_Modern_Sort_*
  [0x0437]: "CP1252"
}

export const codepageBySortId: { [key: number]: Encoding } = {
  [30]: "CP437", // SQL_Latin1_General_CP437_BIN
  [31]: "CP437", // SQL_Latin1_General_CP437_CS_AS
  [32]: "CP437", // SQL_Latin1_General_CP437_CI_AS
  [33]: "CP437", // SQL_Latin1_General_Pref_CP437_CI_AS
  [34]: "CP437", // SQL_Latin1_General_CP437_CI_AI
  [40]: "CP850", // SQL_Latin1_General_CP850_BIN
  [41]: "CP850", // SQL_Latin1_General_CP850_CS_AS
  [42]: "CP850", // SQL_Latin1_General_CP850_CI_AS
  [43]: "CP850", // SQL_Latin1_General_Pref_CP850_CI_AS
  [44]: "CP850", // SQL_Latin1_General_CP850_CI_AI
  [49]: "CP850", // SQL_1xCompat_CP850_CI_AS
  [51]: "CP1252", // SQL_Latin1_General_Cp1_CS_AS_KI_WI
  [52]: "CP1252", // SQL_Latin1_General_Cp1_CI_AS_KI_WI
  [53]: "CP1252", // SQL_Latin1_General_Pref_Cp1_CI_AS_KI_WI
  [54]: "CP1252", // SQL_Latin1_General_Cp1_CI_AI_KI_WI
  [55]: "CP850", // SQL_AltDiction_CP850_CS_AS
  [56]: "CP850", // SQL_AltDiction_Pref_CP850_CI_AS
  [57]: "CP850", // SQL_AltDiction_CP850_CI_AI
  [58]: "CP850", // SQL_Scandinavian_Pref_CP850_CI_AS
  [59]: "CP850", // SQL_Scandinavian_CP850_CS_AS
  [60]: "CP850", // SQL_Scandinavian_CP850_CI_AS
  [61]: "CP850", // SQL_AltDiction_CP850_CI_AS
  [80]: "CP1250", // SQL_Latin1_General_1250_BIN
  [81]: "CP1250", // SQL_Latin1_General_CP1250_CS_AS
  [82]: "CP1250", // SQL_Latin1_General_Cp1250_CI_AS_KI_WI
  [83]: "CP1250", // SQL_Czech_Cp1250_CS_AS_KI_WI
  [84]: "CP1250", // SQL_Czech_Cp1250_CI_AS_KI_WI
  [85]: "CP1250", // SQL_Hungarian_Cp1250_CS_AS_KI_WI
  [86]: "CP1250", // SQL_Hungarian_Cp1250_CI_AS_KI_WI
  [87]: "CP1250", // SQL_Polish_Cp1250_CS_AS_KI_WI
  [88]: "CP1250", // SQL_Polish_Cp1250_CI_AS_KI_WI
  [89]: "CP1250", // SQL_Romanian_Cp1250_CS_AS_KI_WI
  [90]: "CP1250", // SQL_Romanian_Cp1250_CI_AS_KI_WI
  [91]: "CP1250", // SQL_Croatian_Cp1250_CS_AS_KI_WI
  [92]: "CP1250", // SQL_Croatian_Cp1250_CI_AS_KI_WI
  [93]: "CP1250", // SQL_Slovak_Cp1250_CS_AS_KI_WI
  [94]: "CP1250", // SQL_Slovak_Cp1250_CI_AS_KI_WI
  [95]: "CP1250", // SQL_Slovenian_Cp1250_CS_AS_KI_WI
  [96]: "CP1250", // SQL_Slovenian_Cp1250_CI_AS_KI_WI
  [104]: "CP1251", // SQL_Latin1_General_1251_BIN
  [105]: "CP1251", // SQL_Latin1_General_CP1251_CS_AS
  [106]: "CP1251", // SQL_Latin1_General_CP1251_CI_AS
  [107]: "CP1251", // SQL_Ukrainian_Cp1251_CS_AS_KI_WI
  [108]: "CP1251", // SQL_Ukrainian_Cp1251_CI_AS_KI_WI
  [112]: "CP1253", // SQL_Latin1_General_1253_BIN
  [113]: "CP1253", // SQL_Latin1_General_CP1253_CS_AS
  [114]: "CP1253", // SQL_Latin1_General_CP1253_CI_AS
  [120]: "CP1253", // SQL_MixDiction_CP1253_CS_AS
  [121]: "CP1253", // SQL_AltDiction_CP1253_CS_AS
  [122]: "CP1253", // SQL_AltDiction2_CP1253_CS_AS
  [124]: "CP1253", // SQL_Latin1_General_CP1253_CI_AI
  [128]: "CP1254", // SQL_Latin1_General_1254_BIN
  [129]: "CP1254", // SQL_Latin1_General_Cp1254_CS_AS_KI_WI
  [130]: "CP1254", // SQL_Latin1_General_Cp1254_CI_AS_KI_WI
  [136]: "CP1255", // SQL_Latin1_General_1255_BIN
  [137]: "CP1255", // SQL_Latin1_General_CP1255_CS_AS
  [138]: "CP1255", // SQL_Latin1_General_CP1255_CI_AS
  [144]: "CP1256", // SQL_Latin1_General_1256_BIN
  [145]: "CP1256", // SQL_Latin1_General_CP1256_CS_AS
  [146]: "CP1256", // SQL_Latin1_General_CP1256_CI_AS
  [152]: "CP1257", // SQL_Latin1_General_1257_BIN
  [153]: "CP1257", // SQL_Latin1_General_CP1257_CS_AS
  [154]: "CP1257", // SQL_Latin1_General_CP1257_CI_AS
  [155]: "CP1257", // SQL_Estonian_Cp1257_CS_AS_KI_WI
  [156]: "CP1257", // SQL_Estonian_Cp1257_CI_AS_KI_WI
  [157]: "CP1257", // SQL_Latvian_Cp1257_CS_AS_KI_WI
  [158]: "CP1257", // SQL_Latvian_Cp1257_CI_AS_KI_WI
  [159]: "CP1257", // SQL_Lithuanian_Cp1257_CS_AS_KI_WI
  [160]: "CP1257", // SQL_Lithuanian_Cp1257_CI_AS_KI_WI
  [183]: "CP1252", // SQL_Danish_Pref_Cp1_CI_AS_KI_WI
  [184]: "CP1252", // SQL_SwedishPhone_Pref_Cp1_CI_AS_KI_WI
  [185]: "CP1252", // SQL_SwedishStd_Pref_Cp1_CI_AS_KI_WI
  [186]: "CP1252" // SQL_Icelandic_Pref_Cp1_CI_AS_KI_WI
}

export const encoding = (collation: Uint8Array): string | undefined => {
  if (collation[3] & 0x04) return "utf-8"
  if (collation[4]) return codepageBySortId[collation[4]]
  return codepageByLanguageId[collation[0] | (collation[1] << 8)]
}
