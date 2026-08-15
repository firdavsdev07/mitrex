// `toLocaleDateString('uz-UZ', { month: 'long', … })` Node'da ham,
// brauzerda ham «M08 16, Sun» kabi chala natija beradi — uz-UZ uchun ICU
// ma'lumoti to'liq emas va oy nomlari `M01…M12` ga tushib qoladi.
// Shuning uchun nomlar shu yerda beriladi.

const MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentabr',
  'oktabr',
  'noyabr',
  'dekabr',
];

const MONTHS_SHORT = [
  'yan',
  'fev',
  'mar',
  'apr',
  'may',
  'iyn',
  'iyl',
  'avg',
  'sen',
  'okt',
  'noy',
  'dek',
];

const DAYS = [
  'yakshanba',
  'dushanba',
  'seshanba',
  'chorshanba',
  'payshanba',
  'juma',
  'shanba',
];

/** «16-avgust» */
export function uzDate(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d;
  return `${date.getDate()}-${MONTHS[date.getMonth()]}`;
}

/** «16 avg» — jadval va kartalar uchun ixcham */
export function uzDateShort(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d;
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

/** «shanba, 16-avgust» */
export function uzDateFull(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d;
  return `${DAYS[date.getDay()]}, ${uzDate(date)}`;
}

/** «14:05» */
export function uzTime(d: Date | string) {
  const date = typeof d === 'string' ? new Date(d) : d;
  return `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
}
