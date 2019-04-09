import { Source, UnwrapSource } from 'callbag';

export default function merge<T extends Source<any>[]>(
  ...sources: T
): Source<UnwrapSource<T[number]>>;
