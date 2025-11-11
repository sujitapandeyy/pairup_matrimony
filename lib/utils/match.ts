// /lib/utils/match.ts

/**
 * Returns a Tailwind CSS color class based on compatibility score.
 * Used for badges or progress indicators in match-related components.
 */
export const getCompatibilityColor = (score: number): string => {
  if (score >= 90) return "bg-emerald-600";
  if (score >= 80) return "bg-green-600";
  if (score >= 70) return "bg-lime-600";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 50) return "bg-amber-500";
  if (score >= 40) return "bg-orange-500";
  if (score >= 30) return "bg-orange-600";
  if (score >= 20) return "bg-red-500";
  return "bg-red-700";
};
