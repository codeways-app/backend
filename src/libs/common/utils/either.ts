export type Left<L> = {
  type: 'left';
  error: L;
};

export type Right<R> = {
  type: 'right';
  value: R;
};

export type Either<L, R> = Left<L> | Right<R>;

export const left = <const L>(error: L): Left<L> => ({
  error,
  type: 'left',
});

export const right = <const R>(value: R): Right<R> => ({
  type: 'right',
  value: value,
});
