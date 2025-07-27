// npx tsx builder.js
/* eslint-disable no-undef */

import { Temporal } from "@js-temporal/polyfill"
import { writeFileSync } from "fs"

const dstTransitions = [
  // === NORTH AMERICA - US Rule (Mar 2nd Sun -> Nov 1st Sun at 2:00) ===

  // America/New_York - Eastern Time (UTC-5/-4)
  { year: 2020, month: 3, day: 8, type: "spring", timezone: "America/New_York" },
  { year: 2020, month: 11, day: 1, type: "fall", timezone: "America/New_York" },
  { year: 2021, month: 3, day: 14, type: "spring", timezone: "America/New_York" },
  { year: 2021, month: 11, day: 7, type: "fall", timezone: "America/New_York" },
  { year: 2022, month: 3, day: 13, type: "spring", timezone: "America/New_York" },
  { year: 2022, month: 11, day: 6, type: "fall", timezone: "America/New_York" },
  { year: 2023, month: 3, day: 12, type: "spring", timezone: "America/New_York" },
  { year: 2023, month: 11, day: 5, type: "fall", timezone: "America/New_York" },
  { year: 2024, month: 3, day: 10, type: "spring", timezone: "America/New_York" },
  { year: 2024, month: 11, day: 3, type: "fall", timezone: "America/New_York" },
  { year: 2025, month: 3, day: 9, type: "spring", timezone: "America/New_York" },
  { year: 2025, month: 11, day: 2, type: "fall", timezone: "America/New_York" },

  // America/Chicago - Central Time (UTC-6/-5)
  { year: 2020, month: 3, day: 8, type: "spring", timezone: "America/Chicago" },
  { year: 2020, month: 11, day: 1, type: "fall", timezone: "America/Chicago" },
  { year: 2024, month: 3, day: 10, type: "spring", timezone: "America/Chicago" },
  { year: 2024, month: 11, day: 3, type: "fall", timezone: "America/Chicago" },
  { year: 2025, month: 3, day: 9, type: "spring", timezone: "America/Chicago" },
  { year: 2025, month: 11, day: 2, type: "fall", timezone: "America/Chicago" },

  // America/Denver - Mountain Time (UTC-7/-6)
  { year: 2020, month: 3, day: 8, type: "spring", timezone: "America/Denver" },
  { year: 2020, month: 11, day: 1, type: "fall", timezone: "America/Denver" },
  { year: 2024, month: 3, day: 10, type: "spring", timezone: "America/Denver" },
  { year: 2024, month: 11, day: 3, type: "fall", timezone: "America/Denver" },
  { year: 2025, month: 3, day: 9, type: "spring", timezone: "America/Denver" },
  { year: 2025, month: 11, day: 2, type: "fall", timezone: "America/Denver" },

  // America/Los_Angeles - Pacific Time (UTC-8/-7)
  { year: 2020, month: 3, day: 8, type: "spring", timezone: "America/Los_Angeles" },
  { year: 2020, month: 11, day: 1, type: "fall", timezone: "America/Los_Angeles" },
  { year: 2024, month: 3, day: 10, type: "spring", timezone: "America/Los_Angeles" },
  { year: 2024, month: 11, day: 3, type: "fall", timezone: "America/Los_Angeles" },
  { year: 2025, month: 3, day: 9, type: "spring", timezone: "America/Los_Angeles" },
  { year: 2025, month: 11, day: 2, type: "fall", timezone: "America/Los_Angeles" },

  // America/St_Johns - Newfoundland Time (UTC-3:30/-2:30) - UNIQUE 30min offset
  { year: 2020, month: 3, day: 8, type: "spring", timezone: "America/St_Johns" },
  { year: 2020, month: 11, day: 1, type: "fall", timezone: "America/St_Johns" },
  { year: 2024, month: 3, day: 10, type: "spring", timezone: "America/St_Johns" },
  { year: 2024, month: 11, day: 3, type: "fall", timezone: "America/St_Johns" },
  { year: 2025, month: 3, day: 9, type: "spring", timezone: "America/St_Johns" },
  { year: 2025, month: 11, day: 2, type: "fall", timezone: "America/St_Johns" },

  // === EUROPE - EU Rule (Mar last Sun -> Oct last Sun at 1:00 UTC) ===

  // Europe/London - GMT/BST (UTC+0/+1)
  { year: 2020, month: 3, day: 29, type: "spring", timezone: "Europe/London" },
  { year: 2020, month: 10, day: 25, type: "fall", timezone: "Europe/London" },
  { year: 2021, month: 3, day: 28, type: "spring", timezone: "Europe/London" },
  { year: 2021, month: 10, day: 31, type: "fall", timezone: "Europe/London" },
  { year: 2022, month: 3, day: 27, type: "spring", timezone: "Europe/London" },
  { year: 2022, month: 10, day: 30, type: "fall", timezone: "Europe/London" },
  { year: 2023, month: 3, day: 26, type: "spring", timezone: "Europe/London" },
  { year: 2023, month: 10, day: 29, type: "fall", timezone: "Europe/London" },
  { year: 2024, month: 3, day: 31, type: "spring", timezone: "Europe/London" },
  { year: 2024, month: 10, day: 27, type: "fall", timezone: "Europe/London" },
  { year: 2025, month: 3, day: 30, type: "spring", timezone: "Europe/London" },
  { year: 2025, month: 10, day: 26, type: "fall", timezone: "Europe/London" },

  // Europe/Berlin - CET/CEST (UTC+1/+2)
  { year: 2020, month: 3, day: 29, type: "spring", timezone: "Europe/Berlin" },
  { year: 2020, month: 10, day: 25, type: "fall", timezone: "Europe/Berlin" },
  { year: 2024, month: 3, day: 31, type: "spring", timezone: "Europe/Berlin" },
  { year: 2024, month: 10, day: 27, type: "fall", timezone: "Europe/Berlin" },
  { year: 2025, month: 3, day: 30, type: "spring", timezone: "Europe/Berlin" },
  { year: 2025, month: 10, day: 26, type: "fall", timezone: "Europe/Berlin" },

  // Europe/Paris - CET/CEST (UTC+1/+2)
  { year: 2020, month: 3, day: 29, type: "spring", timezone: "Europe/Paris" },
  { year: 2020, month: 10, day: 25, type: "fall", timezone: "Europe/Paris" },
  { year: 2024, month: 3, day: 31, type: "spring", timezone: "Europe/Paris" },
  { year: 2024, month: 10, day: 27, type: "fall", timezone: "Europe/Paris" },
  { year: 2025, month: 3, day: 30, type: "spring", timezone: "Europe/Paris" },
  { year: 2025, month: 10, day: 26, type: "fall", timezone: "Europe/Paris" },

  // Europe/Dublin - GMT/IST (UTC+0/+1) - UNIQUE: Uses IST in summer
  { year: 2020, month: 3, day: 29, type: "spring", timezone: "Europe/Dublin" },
  { year: 2020, month: 10, day: 25, type: "fall", timezone: "Europe/Dublin" },
  { year: 2024, month: 3, day: 31, type: "spring", timezone: "Europe/Dublin" },
  { year: 2024, month: 10, day: 27, type: "fall", timezone: "Europe/Dublin" },
  { year: 2025, month: 3, day: 30, type: "spring", timezone: "Europe/Dublin" },
  { year: 2025, month: 10, day: 26, type: "fall", timezone: "Europe/Dublin" },

  // === SOUTHERN HEMISPHERE - OPPOSITE SEASONS ===

  // Australia/Sydney - AEST/AEDT (UTC+10/+11) - Oct 1st Sun -> Apr 1st Sun
  { year: 2020, month: 10, day: 4, type: "spring", timezone: "Australia/Sydney" },
  { year: 2021, month: 4, day: 4, type: "fall", timezone: "Australia/Sydney" },
  { year: 2021, month: 10, day: 3, type: "spring", timezone: "Australia/Sydney" },
  { year: 2022, month: 4, day: 3, type: "fall", timezone: "Australia/Sydney" },
  { year: 2022, month: 10, day: 2, type: "spring", timezone: "Australia/Sydney" },
  { year: 2023, month: 4, day: 2, type: "fall", timezone: "Australia/Sydney" },
  { year: 2023, month: 10, day: 1, type: "spring", timezone: "Australia/Sydney" },
  { year: 2024, month: 4, day: 7, type: "fall", timezone: "Australia/Sydney" },
  { year: 2024, month: 10, day: 6, type: "spring", timezone: "Australia/Sydney" },
  { year: 2025, month: 4, day: 6, type: "fall", timezone: "Australia/Sydney" },

  // Australia/Melbourne - AEST/AEDT (UTC+10/+11)
  { year: 2020, month: 10, day: 4, type: "spring", timezone: "Australia/Melbourne" },
  { year: 2021, month: 4, day: 4, type: "fall", timezone: "Australia/Melbourne" },
  { year: 2024, month: 10, day: 6, type: "spring", timezone: "Australia/Melbourne" },
  { year: 2025, month: 4, day: 6, type: "fall", timezone: "Australia/Melbourne" },

  // Pacific/Auckland - NZST/NZDT (UTC+12/+13) - Sep last Sun -> Apr 1st Sun
  { year: 2020, month: 9, day: 27, type: "spring", timezone: "Pacific/Auckland" },
  { year: 2021, month: 4, day: 4, type: "fall", timezone: "Pacific/Auckland" },
  { year: 2021, month: 9, day: 26, type: "spring", timezone: "Pacific/Auckland" },
  { year: 2022, month: 4, day: 3, type: "fall", timezone: "Pacific/Auckland" },
  { year: 2022, month: 9, day: 25, type: "spring", timezone: "Pacific/Auckland" },
  { year: 2023, month: 4, day: 2, type: "fall", timezone: "Pacific/Auckland" },
  { year: 2023, month: 9, day: 24, type: "spring", timezone: "Pacific/Auckland" },
  { year: 2024, month: 4, day: 7, type: "fall", timezone: "Pacific/Auckland" },
  { year: 2024, month: 9, day: 29, type: "spring", timezone: "Pacific/Auckland" },
  { year: 2025, month: 4, day: 6, type: "fall", timezone: "Pacific/Auckland" },

  // Pacific/Chatham - CHAST/CHADT (UTC+12:45/+13:45) - UNIQUE 45min offset
  { year: 2020, month: 9, day: 27, type: "spring", timezone: "Pacific/Chatham" },
  { year: 2021, month: 4, day: 4, type: "fall", timezone: "Pacific/Chatham" },
  { year: 2024, month: 9, day: 29, type: "spring", timezone: "Pacific/Chatham" },
  { year: 2025, month: 4, day: 6, type: "fall", timezone: "Pacific/Chatham" },

  // === MIDDLE EAST / ASIA ===

  // Asia/Tehran - IRST/IRDT (UTC+3:30/+4:30) - 30min offset, different rules
  { year: 2020, month: 3, day: 21, type: "spring", timezone: "Asia/Tehran" },
  { year: 2020, month: 9, day: 21, type: "fall", timezone: "Asia/Tehran" },
  { year: 2021, month: 3, day: 21, type: "spring", timezone: "Asia/Tehran" },
  { year: 2021, month: 9, day: 21, type: "fall", timezone: "Asia/Tehran" },

  // Asia/Jerusalem - IST/IDT (UTC+2/+3) - Different from EU rules
  { year: 2020, month: 3, day: 27, type: "spring", timezone: "Asia/Jerusalem" },
  { year: 2020, month: 10, day: 25, type: "fall", timezone: "Asia/Jerusalem" },
  { year: 2024, month: 3, day: 29, type: "spring", timezone: "Asia/Jerusalem" },
  { year: 2024, month: 10, day: 27, type: "fall", timezone: "Asia/Jerusalem" },
  { year: 2025, month: 3, day: 28, type: "spring", timezone: "Asia/Jerusalem" },
  { year: 2025, month: 10, day: 26, type: "fall", timezone: "Asia/Jerusalem" },

  // === SOUTH AMERICA ===

  // America/Sao_Paulo - BRT/BRST (UTC-3/-2) - Had DST until 2019
  { year: 2018, month: 11, day: 4, type: "spring", timezone: "America/Sao_Paulo" },
  { year: 2019, month: 2, day: 17, type: "fall", timezone: "America/Sao_Paulo" },

  // America/Santiago - CLT/CLST (UTC-4/-3) - Southern hemisphere
  { year: 2020, month: 9, day: 6, type: "spring", timezone: "America/Santiago" },
  { year: 2021, month: 4, day: 4, type: "fall", timezone: "America/Santiago" },
  { year: 2021, month: 9, day: 5, type: "spring", timezone: "America/Santiago" },
  { year: 2022, month: 4, day: 3, type: "fall", timezone: "America/Santiago" },

  // === EDGE CASES & HISTORICAL ===

  // Europe/Moscow - MSK (UTC+3) - Had DST until 2010, then permanent time changes
  { year: 2010, month: 3, day: 28, type: "spring", timezone: "Europe/Moscow" },
  { year: 2010, month: 10, day: 31, type: "fall", timezone: "Europe/Moscow" },

  // America/Arizona - MST (UTC-7) - Had DST 1918-1919, 1942-1944, 1967
  { year: 1967, month: 4, day: 30, type: "spring", timezone: "America/Phoenix" },
  { year: 1967, month: 10, day: 29, type: "fall", timezone: "America/Phoenix" },

  // Australia/Lord_Howe - LHST/LHDT (UTC+10:30/+11) - UNIQUE 30min DST shift
  { year: 2020, month: 10, day: 4, type: "spring", timezone: "Australia/Lord_Howe" },
  { year: 2021, month: 4, day: 4, type: "fall", timezone: "Australia/Lord_Howe" },
  { year: 2024, month: 10, day: 6, type: "spring", timezone: "Australia/Lord_Howe" },
  { year: 2025, month: 4, day: 6, type: "fall", timezone: "Australia/Lord_Howe" },

  // === ADDITIONAL DST TIMEZONES ===

  // Europe/Athens - EET/EEST (UTC+2/+3) - EU DST rules
  { year: 2020, month: 3, day: 29, type: "spring", timezone: "Europe/Athens" },
  { year: 2020, month: 10, day: 25, type: "fall", timezone: "Europe/Athens" },
  { year: 2024, month: 3, day: 31, type: "spring", timezone: "Europe/Athens" },
  { year: 2024, month: 10, day: 27, type: "fall", timezone: "Europe/Athens" },

  // Europe/Helsinki - EET/EEST (UTC+2/+3) - EU DST rules
  { year: 2020, month: 3, day: 29, type: "spring", timezone: "Europe/Helsinki" },
  { year: 2020, month: 10, day: 25, type: "fall", timezone: "Europe/Helsinki" },
  { year: 2024, month: 3, day: 31, type: "spring", timezone: "Europe/Helsinki" },
  { year: 2024, month: 10, day: 27, type: "fall", timezone: "Europe/Helsinki" },

  // America/Toronto - EST/EDT (UTC-5/-4) - Same as New_York
  { year: 2020, month: 3, day: 8, type: "spring", timezone: "America/Toronto" },
  { year: 2020, month: 11, day: 1, type: "fall", timezone: "America/Toronto" },
  { year: 2024, month: 3, day: 10, type: "spring", timezone: "America/Toronto" },
  { year: 2024, month: 11, day: 3, type: "fall", timezone: "America/Toronto" },

  // America/Vancouver - PST/PDT (UTC-8/-7) - Same as Los_Angeles
  { year: 2020, month: 3, day: 8, type: "spring", timezone: "America/Vancouver" },
  { year: 2020, month: 11, day: 1, type: "fall", timezone: "America/Vancouver" },
  { year: 2024, month: 3, day: 10, type: "spring", timezone: "America/Vancouver" },
  { year: 2024, month: 11, day: 3, type: "fall", timezone: "America/Vancouver" },

  // Asia/Baku - AZT/AZST (UTC+4/+5) - Had DST until 2016
  { year: 2015, month: 3, day: 29, type: "spring", timezone: "Asia/Baku" },
  { year: 2015, month: 10, day: 25, type: "fall", timezone: "Asia/Baku" },

  // Europe/Istanbul - TRT (UTC+3) - Had DST until 2014, then permanent UTC+3
  { year: 2014, month: 3, day: 30, type: "spring", timezone: "Europe/Istanbul" },
  { year: 2014, month: 10, day: 26, type: "fall", timezone: "Europe/Istanbul" },

  // === ADDITIONAL NORTH AMERICA ===

  // America/Mexico_City - CST/CDT (UTC-6/-5) - Had DST until 2022
  { year: 2020, month: 4, day: 5, type: "spring", timezone: "America/Mexico_City" },
  { year: 2020, month: 10, day: 25, type: "fall", timezone: "America/Mexico_City" },
  { year: 2022, month: 4, day: 3, type: "spring", timezone: "America/Mexico_City" },
  { year: 2022, month: 10, day: 30, type: "fall", timezone: "America/Mexico_City" },

  // America/Havana - CST/CDT (UTC-5/-4) - Cuba DST rules
  { year: 2020, month: 3, day: 8, type: "spring", timezone: "America/Havana" },
  { year: 2020, month: 11, day: 1, type: "fall", timezone: "America/Havana" },
  { year: 2024, month: 3, day: 10, type: "spring", timezone: "America/Havana" },
  { year: 2024, month: 11, day: 3, type: "fall", timezone: "America/Havana" },

  // === ADDITIONAL EUROPE ===

  // Europe/Madrid - CET/CEST (UTC+1/+2) - EU DST rules
  { year: 2020, month: 3, day: 29, type: "spring", timezone: "Europe/Madrid" },
  { year: 2020, month: 10, day: 25, type: "fall", timezone: "Europe/Madrid" },
  { year: 2024, month: 3, day: 31, type: "spring", timezone: "Europe/Madrid" },
  { year: 2024, month: 10, day: 27, type: "fall", timezone: "Europe/Madrid" },

  // Europe/Rome - CET/CEST (UTC+1/+2) - EU DST rules
  { year: 2020, month: 3, day: 29, type: "spring", timezone: "Europe/Rome" },
  { year: 2020, month: 10, day: 25, type: "fall", timezone: "Europe/Rome" },
  { year: 2024, month: 3, day: 31, type: "spring", timezone: "Europe/Rome" },
  { year: 2024, month: 10, day: 27, type: "fall", timezone: "Europe/Rome" },

  // Europe/Amsterdam - CET/CEST (UTC+1/+2) - EU DST rules
  { year: 2020, month: 3, day: 29, type: "spring", timezone: "Europe/Amsterdam" },
  { year: 2020, month: 10, day: 25, type: "fall", timezone: "Europe/Amsterdam" },
  { year: 2024, month: 3, day: 31, type: "spring", timezone: "Europe/Amsterdam" },
  { year: 2024, month: 10, day: 27, type: "fall", timezone: "Europe/Amsterdam" },

  // Europe/Stockholm - CET/CEST (UTC+1/+2) - EU DST rules
  { year: 2020, month: 3, day: 29, type: "spring", timezone: "Europe/Stockholm" },
  { year: 2020, month: 10, day: 25, type: "fall", timezone: "Europe/Stockholm" },
  { year: 2024, month: 3, day: 31, type: "spring", timezone: "Europe/Stockholm" },
  { year: 2024, month: 10, day: 27, type: "fall", timezone: "Europe/Stockholm" },

  // Europe/Zurich - CET/CEST (UTC+1/+2) - EU DST rules
  { year: 2020, month: 3, day: 29, type: "spring", timezone: "Europe/Zurich" },
  { year: 2020, month: 10, day: 25, type: "fall", timezone: "Europe/Zurich" },
  { year: 2024, month: 3, day: 31, type: "spring", timezone: "Europe/Zurich" },
  { year: 2024, month: 10, day: 27, type: "fall", timezone: "Europe/Zurich" },

  // Europe/Warsaw - CET/CEST (UTC+1/+2) - EU DST rules
  { year: 2020, month: 3, day: 29, type: "spring", timezone: "Europe/Warsaw" },
  { year: 2020, month: 10, day: 25, type: "fall", timezone: "Europe/Warsaw" },
  { year: 2024, month: 3, day: 31, type: "spring", timezone: "Europe/Warsaw" },
  { year: 2024, month: 10, day: 27, type: "fall", timezone: "Europe/Warsaw" },

  // Europe/Prague - CET/CEST (UTC+1/+2) - EU DST rules
  { year: 2020, month: 3, day: 29, type: "spring", timezone: "Europe/Prague" },
  { year: 2020, month: 10, day: 25, type: "fall", timezone: "Europe/Prague" },
  { year: 2024, month: 3, day: 31, type: "spring", timezone: "Europe/Prague" },
  { year: 2024, month: 10, day: 27, type: "fall", timezone: "Europe/Prague" },

  // Europe/Budapest - CET/CEST (UTC+1/+2) - EU DST rules
  { year: 2020, month: 3, day: 29, type: "spring", timezone: "Europe/Budapest" },
  { year: 2020, month: 10, day: 25, type: "fall", timezone: "Europe/Budapest" },
  { year: 2024, month: 3, day: 31, type: "spring", timezone: "Europe/Budapest" },
  { year: 2024, month: 10, day: 27, type: "fall", timezone: "Europe/Budapest" },

  // Europe/Bucharest - EET/EEST (UTC+2/+3) - EU DST rules
  { year: 2020, month: 3, day: 29, type: "spring", timezone: "Europe/Bucharest" },
  { year: 2020, month: 10, day: 25, type: "fall", timezone: "Europe/Bucharest" },
  { year: 2024, month: 3, day: 31, type: "spring", timezone: "Europe/Bucharest" },
  { year: 2024, month: 10, day: 27, type: "fall", timezone: "Europe/Bucharest" },

  // Europe/Skopje - CET/CEST (UTC+1/+2) - EU DST rules
  { year: 2020, month: 3, day: 29, type: "spring", timezone: "Europe/Skopje" },
  { year: 2020, month: 10, day: 25, type: "fall", timezone: "Europe/Skopje" },
  { year: 2024, month: 3, day: 31, type: "spring", timezone: "Europe/Skopje" },
  { year: 2024, month: 10, day: 27, type: "fall", timezone: "Europe/Skopje" },

  // === MIDDLE EAST / ASIA ADDITIONS ===

  // Asia/Damascus - EET/EEST (UTC+2/+3) - Had DST until 2022
  { year: 2020, month: 3, day: 27, type: "spring", timezone: "Asia/Damascus" },
  { year: 2020, month: 10, day: 30, type: "fall", timezone: "Asia/Damascus" },
  { year: 2021, month: 3, day: 26, type: "spring", timezone: "Asia/Damascus" },
  { year: 2021, month: 10, day: 29, type: "fall", timezone: "Asia/Damascus" },

  // Asia/Beirut - EET/EEST (UTC+2/+3) - Lebanon DST rules
  { year: 2020, month: 3, day: 29, type: "spring", timezone: "Asia/Beirut" },
  { year: 2020, month: 10, day: 25, type: "fall", timezone: "Asia/Beirut" },
  { year: 2024, month: 3, day: 31, type: "spring", timezone: "Asia/Beirut" },
  { year: 2024, month: 10, day: 27, type: "fall", timezone: "Asia/Beirut" },

  // Asia/Amman - EET/EEST (UTC+2/+3) - Had DST until 2021
  { year: 2020, month: 3, day: 27, type: "spring", timezone: "Asia/Amman" },
  { year: 2020, month: 10, day: 30, type: "fall", timezone: "Asia/Amman" },
  { year: 2021, month: 3, day: 26, type: "spring", timezone: "Asia/Amman" },
  { year: 2021, month: 10, day: 29, type: "fall", timezone: "Asia/Amman" },

  // Asia/Gaza - EET/EEST (UTC+2/+3) - Palestine DST rules
  { year: 2020, month: 3, day: 28, type: "spring", timezone: "Asia/Gaza" },
  { year: 2020, month: 10, day: 24, type: "fall", timezone: "Asia/Gaza" },
  { year: 2023, month: 4, day: 29, type: "spring", timezone: "Asia/Gaza" },
  { year: 2023, month: 10, day: 28, type: "fall", timezone: "Asia/Gaza" },

  // === AFRICA ===

  // Africa/Cairo - EET/EEST (UTC+2/+3) - Egypt had DST until 2014
  { year: 2014, month: 5, day: 15, type: "spring", timezone: "Africa/Cairo" },
  { year: 2014, month: 9, day: 25, type: "fall", timezone: "Africa/Cairo" },

  // Africa/Casablanca - WET/WEST (UTC+0/+1) - Morocco permanent UTC+1 since 2018
  { year: 2017, month: 3, day: 26, type: "spring", timezone: "Africa/Casablanca" },
  { year: 2017, month: 10, day: 29, type: "fall", timezone: "Africa/Casablanca" },

  // === PACIFIC ===

  // Pacific/Fiji - FJT/FJST (UTC+12/+13) - Last DST was 2018-2019 season
  { year: 2018, month: 11, day: 4, type: "spring", timezone: "Pacific/Fiji" },
  { year: 2019, month: 1, day: 13, type: "fall", timezone: "Pacific/Fiji" },

  // Pacific/Norfolk - NFT/NFDT (UTC+11/+12) - Norfolk Island DST
  { year: 2020, month: 10, day: 4, type: "spring", timezone: "Pacific/Norfolk" },
  { year: 2021, month: 4, day: 4, type: "fall", timezone: "Pacific/Norfolk" },
  { year: 2024, month: 10, day: 6, type: "spring", timezone: "Pacific/Norfolk" },
  { year: 2025, month: 4, day: 6, type: "fall", timezone: "Pacific/Norfolk" },

  // === SOUTH AMERICA ADDITIONS ===

  // America/Asuncion - PYT/PYST (UTC-3/-2) - Paraguay DST rules
  { year: 2020, month: 10, day: 4, type: "spring", timezone: "America/Asuncion" },
  { year: 2021, month: 3, day: 28, type: "fall", timezone: "America/Asuncion" },
  { year: 2021, month: 10, day: 3, type: "spring", timezone: "America/Asuncion" },
  { year: 2022, month: 3, day: 27, type: "fall", timezone: "America/Asuncion" },

  // America/Montevideo - UYT/UYST (UTC-3/-2) - Uruguay DST rules (stopped 2015)
  { year: 2014, month: 10, day: 5, type: "spring", timezone: "America/Montevideo" },
  { year: 2015, month: 3, day: 8, type: "fall", timezone: "America/Montevideo" },

  // === STATIC OFFSET EXAMPLE (will generate warnings) ===

  // Etc/GMT-8 - UTC+08:00 (no DST) - Static example for testing
  { year: 2024, month: 3, day: 31, type: "spring", timezone: "Etc/GMT-8" },
  { year: 2024, month: 10, day: 27, type: "fall", timezone: "Etc/GMT-8" }
]

const disambiguationStrategies = ["compatible", "earlier", "later", "reject"]

function validateDSTTransitions() {
  console.log("Validating DST transition dates...\n")

  const errors = []
  const warnings = []

  for (const transition of dstTransitions) {
    try {
      const { day, month, timezone, type, year } = transition

      // Create dates around the supposed transition
      const transitionDate = new Date(year, month - 1, day)
      const dayBefore = new Date(transitionDate)
      dayBefore.setDate(dayBefore.getDate() - 1)
      const dayAfter = new Date(transitionDate)
      dayAfter.setDate(dayAfter.getDate() + 1)

      // Check offset changes using Temporal
      const checkTime = { hour: 12, minute: 0, second: 0, millisecond: 0 }

      const beforeZdt = Temporal.ZonedDateTime.from({
        year: dayBefore.getFullYear(),
        month: dayBefore.getMonth() + 1,
        day: dayBefore.getDate(),
        ...checkTime,
        timeZone: timezone
      })

      const afterZdt = Temporal.ZonedDateTime.from({
        year: dayAfter.getFullYear(),
        month: dayAfter.getMonth() + 1,
        day: dayAfter.getDate(),
        ...checkTime,
        timeZone: timezone
      })

      const beforeOffset = beforeZdt.offsetNanoseconds / (1000 * 1000 * 1000 * 60 * 60) // Convert to hours
      const afterOffset = afterZdt.offsetNanoseconds / (1000 * 1000 * 1000 * 60 * 60)

      const offsetDiff = afterOffset - beforeOffset

      // Validate transition type matches offset change
      if (type === "spring" && offsetDiff <= 0) {
        errors.push(
          `${timezone} ${year}-${month}-${day}: Spring transition should increase offset, but got ${offsetDiff}h change`
        )
      } else if (type === "fall" && offsetDiff >= 0) {
        errors.push(
          `${timezone} ${year}-${month}-${day}: Fall transition should decrease offset, but got ${offsetDiff}h change`
        )
      } else if (Math.abs(offsetDiff) < 0.5) {
        warnings.push(
          `${timezone} ${year}-${month}-${day}: Small offset change (${offsetDiff}h) - might not be a real DST transition`
        )
      } else {
        console.log(`VALID ${timezone} ${year}-${month}-${day} (${type}): ${offsetDiff > 0 ? "+" : ""}${offsetDiff}h`)
      }
    } catch (error) {
      errors.push(`${transition.timezone} ${transition.year}-${transition.month}-${transition.day}: ${error.message}`)
    }
  }

  console.log(`\n=== VALIDATION RESULTS ===`)
  console.log(`Total transitions checked: ${dstTransitions.length}`)
  console.log(`Errors: ${errors.length}`)
  console.log(`Warnings: ${warnings.length}`)

  if (errors.length > 0) {
    console.log("\nERRORS:")
    errors.forEach((error) => console.log(`  - ${error}`))
  }

  if (warnings.length > 0) {
    console.log("\nWARNINGS:")
    warnings.forEach((warning) => console.log(`  - ${warning}`))
  }

  return { errors, warnings }
}

function generateTestData() {
  const results = []

  // Add CSV header
  results.push("timezone,local_time,disambiguation,temporal_utc")

  let totalTestCases = 0

  // Get unique timezones from dstTransitions
  const uniqueTimezones = [...new Set(dstTransitions.map((t) => t.timezone))]

  for (const timezone of uniqueTimezones) {
    console.log(`Processing timezone: ${timezone} (${uniqueTimezones.indexOf(timezone) + 1}/${uniqueTimezones.length})`)

    // Filter transitions for this specific timezone
    const timezoneDstTransitions = dstTransitions.filter((t) => t.timezone === timezone)

    for (const transition of timezoneDstTransitions) {
      // Generate times around DST transitions with expanded coverage
      const baseDate = { year: transition.year, month: transition.month, day: transition.day }

      // Test comprehensive time ranges around DST transitions
      // Generate every 15 minutes for 48 hours each side of transition
      for (let hourOffset = -48; hourOffset <= 48; hourOffset += 0.25) {
        const totalMinutes = hourOffset * 60
        const adjustedDate = new Date(baseDate.year, baseDate.month - 1, baseDate.day)
        adjustedDate.setMinutes(adjustedDate.getMinutes() + totalMinutes)

        const wholeHour = adjustedDate.getHours()
        const minutes = adjustedDate.getMinutes()
        const adjustedDay = adjustedDate.getDate()
        const adjustedMonth = adjustedDate.getMonth() + 1
        const adjustedYear = adjustedDate.getFullYear()

        const localTime = {
          year: adjustedYear,
          month: adjustedMonth,
          day: adjustedDay,
          hour: wholeHour,
          minute: minutes,
          second: 0,
          millisecond: 0,
          timeZone: timezone
        }

        for (const disambiguation of disambiguationStrategies) {
          try {
            const zonedDateTime = Temporal.ZonedDateTime.from(localTime, { disambiguation })

            const utcString = zonedDateTime.toInstant().toString()
            const localTimeString = `${localTime.year}-${String(localTime.month).padStart(2, "0")}-${
              String(localTime.day).padStart(2, "0")
            }T${String(wholeHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00[${timezone}]`

            results.push(`"${timezone}","${localTimeString}","${disambiguation}","${utcString}"`)
            totalTestCases++
          } catch (error) {
            // Distinguish between successful rejections and actual errors
            const localTimeString = `${localTime.year}-${String(localTime.month).padStart(2, "0")}-${
              String(localTime.day).padStart(2, "0")
            }T${String(wholeHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00[${timezone}]`

            if (disambiguation === "reject" && error.message.includes("multiple instants found")) {
              // This is a successful rejection of an ambiguous time
              results.push(`"${timezone}","${localTimeString}","${disambiguation}","SUCCESSFULLY-REJECTED"`)
            } else {
              // This is an actual error (e.g., invalid date, DST gap, etc.)
              results.push(
                `"${timezone}","${localTimeString}","${disambiguation}","ERROR: ${error.message.replace(/"/g, "\"\"")}"`
              )
            }
            totalTestCases++
          }
        }
      }
    }

    // Also add some fixed timezone tests for comprehensive coverage
    if (timezone.startsWith("Etc/") || timezone === "UTC" || timezone === "GMT") {
      const fixedTestDates = [
        { year: 2025, month: 1, day: 15 },
        { year: 2025, month: 6, day: 15 },
        { year: 2025, month: 12, day: 15 }
      ]

      for (const testDate of fixedTestDates) {
        for (let hour = 0; hour < 24; hour += 3) {
          for (const minutes of [0, 30]) {
            const localTime = {
              ...testDate,
              hour,
              minute: minutes,
              second: 0,
              millisecond: 0,
              timeZone: timezone
            }

            for (const disambiguation of disambiguationStrategies) {
              try {
                const zonedDateTime = Temporal.ZonedDateTime.from(localTime, { disambiguation })

                const utcString = zonedDateTime.toInstant().toString()
                const localTimeString = `${localTime.year}-${String(localTime.month).padStart(2, "0")}-${
                  String(localTime.day).padStart(2, "0")
                }T${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00[${timezone}]`

                results.push(`"${timezone}","${localTimeString}","${disambiguation}","${utcString}"`)
                totalTestCases++
              } catch (error) {
                const localTimeString = `${localTime.year}-${String(localTime.month).padStart(2, "0")}-${
                  String(localTime.day).padStart(2, "0")
                }T${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00[${timezone}]`

                if (disambiguation === "reject" && error.message.includes("multiple instants found")) {
                  // This is a successful rejection of an ambiguous time
                  results.push(`"${timezone}","${localTimeString}","${disambiguation}","SUCCESSFULLY-REJECTED"`)
                } else {
                  // This is an actual error (e.g., invalid date, DST gap, etc.)
                  results.push(
                    `"${timezone}","${localTimeString}","${disambiguation}","ERROR: ${
                      error.message.replace(/"/g, "\"\"")
                    }"`
                  )
                }
                totalTestCases++
              }
            }
          }
        }
      }
    }
  }

  console.log(`Generated ${totalTestCases} total test cases`)
  return results.join("\n")
}

console.log("Running DST transition validation...")
const _validationResults = validateDSTTransitions()

console.log("Generating DST test data with Temporal...")
const csvData = generateTestData()

// Write to CSV file
const filename = "dst-test-cases.csv"
writeFileSync(filename, csvData)

console.log(`Generated ${filename} with comprehensive DST test data`)
console.log(`File contains ${csvData.split("\n").length - 1} test cases`)
