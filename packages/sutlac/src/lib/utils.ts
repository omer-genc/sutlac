import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** English noun for a count: plural(1, "task") -> "task", plural(3, "task") -> "tasks". */
export const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many)
