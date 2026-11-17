// Merely saving a title must not make an unchanged rating look new.
export function ratingDate(
  previousRating: number | null,
  nextRating: number | null,
  previousDate: Date | null,
  now = new Date(),
): Date | null {
  if (nextRating === null) return null;
  return nextRating !== previousRating ? now : previousDate;
}
