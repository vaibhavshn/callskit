export type IfUndefined<T, Y, N> = [T] extends [undefined] ? Y : N;
