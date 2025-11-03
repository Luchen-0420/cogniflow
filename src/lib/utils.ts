import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Params = Partial<
  Record<keyof URLSearchParams, string | number | null | undefined>
>;

export function createQueryString(
  params: Params,
  searchParams: URLSearchParams
) {
  const newSearchParams = new URLSearchParams(searchParams?.toString());

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) {
      newSearchParams.delete(key);
    } else {
      newSearchParams.set(key, String(value));
    }
  }

  return newSearchParams.toString();
}

export function formatDate(
  date: Date | string | number,
  opts: Intl.DateTimeFormatOptions = {}
) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: opts.month ?? "long",
    day: opts.day ?? "numeric",
    year: opts.year ?? "numeric",
    ...opts,
  }).format(new Date(date));
}

/**
 * 获取本地时间的 ISO 格式字符串（不带时区信息）
 * 用于避免时区转换问题
 * 
 * @param date - Date 对象，默认为当前时间
 * @returns 格式为 "YYYY-MM-DDTHH:mm:ss" 的字符串
 * 
 * @example
 * getLocalISOString() // "2025-11-03T15:30:00"
 * getLocalISOString(new Date('2025-11-04 01:30')) // "2025-11-04T01:30:00"
 */
export function getLocalISOString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * 将不带时区的 ISO 时间字符串解析为本地时间
 * 避免时区转换问题
 * 
 * @param dateTimeString - ISO 格式的时间字符串
 * @returns Date 对象
 * 
 * @example
 * parseLocalDateTime("2025-11-04T01:30:00") // 本地时间 2025-11-04 01:30:00
 */
export function parseLocalDateTime(dateTimeString: string): Date {
  if (!dateTimeString) {
    return new Date();
  }
  
  // 只有日期，没有时间
  if (!dateTimeString.includes('T')) {
    return new Date(dateTimeString + 'T00:00:00');
  }
  
  // 如果有时区信息（Z 或 +08:00 等），正常解析
  if (dateTimeString.includes('Z') || dateTimeString.match(/[+-]\d{2}:\d{2}$/)) {
    return new Date(dateTimeString);
  }
  
  // 没有时区信息，手动解析为本地时间
  const parts = dateTimeString.split(/[-T:]/);
  return new Date(
    parseInt(parts[0]), // year
    parseInt(parts[1]) - 1, // month (0-indexed)
    parseInt(parts[2]), // day
    parseInt(parts[3] || '0'), // hour
    parseInt(parts[4] || '0'), // minute
    parseInt(parts[5] || '0')  // second
  );
}
