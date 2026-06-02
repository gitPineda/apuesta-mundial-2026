const DATE_DIGITS_LENGTH = 8;

export function onlyDigits(value: string, maxLength?: number) {
  const digits = value.replace(/\D/g, '');
  return typeof maxLength === 'number' ? digits.slice(0, maxLength) : digits;
}

export function onlyLetters(value: string, maxLength?: number) {
  const letters = value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, '');
  return typeof maxLength === 'number' ? letters.slice(0, maxLength) : letters;
}

export function onlyUppercaseCode(value: string, maxLength = 12) {
  return value.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, maxLength);
}

export function onlyDecimal(value: string, maxIntegerDigits = 8, maxDecimals = 2) {
  const normalized = value.replace(',', '.').replace(/[^\d.]/g, '');
  const [integerPart, ...decimalParts] = normalized.split('.');
  const integer = integerPart.slice(0, maxIntegerDigits);
  const decimal = decimalParts.join('').slice(0, maxDecimals);
  return normalized.includes('.') ? `${integer}.${decimal}` : integer;
}

export function maskTime(value: string) {
  const digits = onlyDigits(value, 4);
  const hour = clampPart(digits.slice(0, 2), 23, true);
  const minute = clampPart(digits.slice(2, 4), 59, true);

  if (digits.length <= 2) return hour;
  return `${hour}:${minute}`;
}

export function maskDate(value: string) {
  const digits = onlyDigits(value, DATE_DIGITS_LENGTH);
  const year = digits.slice(0, 4);
  const month = clampMonth(digits.slice(4, 6));
  const day = clampDay(digits.slice(6, 8), year, month);

  if (digits.length <= 4) return year;
  if (digits.length <= 6) return `${year}-${month}`;
  return `${year}-${month}-${day}`;
}

export function isValidDateMask(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (yearText.length !== 4 || month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
}

function clampPart(value: string, max: number, allowZero: boolean) {
  if (value.length < 2) return value;
  const parsed = Number(value);
  if (!allowZero && parsed < 1) return '01';
  if (parsed > max) return String(max).padStart(2, '0');
  return value;
}

function clampMonth(value: string) {
  if (value.length < 2) return value;
  const parsed = Number(value);
  if (parsed < 1) return '01';
  if (parsed > 12) return '12';
  return value;
}

function clampDay(value: string, yearText: string, monthText: string) {
  if (value.length < 2) return value;
  const month = Number(monthText);
  const year = Number(yearText);
  const max = daysInMonth(year, month);
  const parsed = Number(value);
  if (parsed < 1) return '01';
  if (parsed > max) return String(max).padStart(2, '0');
  return value;
}

function daysInMonth(year: number, month: number) {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  if ([4, 6, 9, 11].includes(month)) return 30;
  return 31;
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
