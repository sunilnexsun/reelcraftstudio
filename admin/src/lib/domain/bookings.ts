export interface BookingLike {
  id: string; code: string; title: string; start_at: string; end_at: string
  equipment: string[]; status: string
}
export interface Conflict { booking_id: string; code: string; title: string; start_at: string; end_at: string; reason: string }

const ACTIVE = new Set(['requested', 'confirmed'])

/** Half-open interval overlap: a shoot ending at 13:00 doesn't clash with one starting at 13:00. */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd)
}

/** Same rule as public.booking_conflicts(): overlapping active bookings that share crew or equipment. */
export function findConflicts(
  candidate: { start_at: string; end_at: string; crew: string[]; equipment: string[]; excludeId?: string | null },
  bookings: BookingLike[],
  crewByBooking: Map<string, string[]>,
  memberName: (id: string) => string = (id) => id,
): Conflict[] {
  const eq = new Set(candidate.equipment.map((e) => e.trim()).filter(Boolean))
  const crew = new Set(candidate.crew)
  const out: Conflict[] = []
  for (const b of bookings) {
    if (!ACTIVE.has(b.status) || b.id === candidate.excludeId) continue
    if (!overlaps(b.start_at, b.end_at, candidate.start_at, candidate.end_at)) continue
    const sharedCrew = (crewByBooking.get(b.id) ?? []).filter((m) => crew.has(m))
    const sharedEq = b.equipment.filter((e) => eq.has(e))
    if (!sharedCrew.length && !sharedEq.length) continue
    const reason = [
      sharedCrew.length ? `crew: ${sharedCrew.map(memberName).join(', ')}` : null,
      sharedEq.length ? `equipment: ${sharedEq.join(', ')}` : null,
    ].filter(Boolean).join('; ')
    out.push({ booking_id: b.id, code: b.code, title: b.title, start_at: b.start_at, end_at: b.end_at, reason })
  }
  return out
}
