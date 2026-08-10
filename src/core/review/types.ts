// A reviewer's manual decision on one invoice line -- separate from Finding
// (checks/types.ts), which is an automated rule result. A line can be
// accepted, flagged, or left undecided (status: null), independent of
// whether any automated findings target it.
export type ReviewStatus = 'accepted' | 'flagged'

export interface PositionReview {
  status: ReviewStatus | null
  note: string
}

// A fresh object each call -- callers may hold onto or mutate the result,
// so this must never be a shared singleton.
export function emptyReview(): PositionReview {
  return { status: null, note: '' }
}
