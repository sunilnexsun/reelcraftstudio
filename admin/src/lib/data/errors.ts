import { DataError } from './types'

type PgLike = { code?: string; message?: string; details?: string | null; hint?: string | null }

/** Turn Postgres/PostgREST errors into messages a studio manager can act on, without leaking internals. */
export function friendlyError(e: unknown): DataError {
  if (e instanceof DataError) return e
  const err = (e ?? {}) as PgLike
  const msg = err.message ?? String(e)
  switch (err.code) {
    case '42501':
      return new DataError("You don't have permission to do that. Ask an owner to change your role if you need access.", err.code)
    case '23505':
      return new DataError(/slug/.test(msg) ? 'That URL slug is already used by another service.' : /invoice_number/.test(msg) ? 'That invoice number already exists.' : 'A record with these details already exists.', err.code)
    case '23503': case '23001':
      return new DataError('This record is linked to other records (for example invoices or payments). Remove those links first.', err.code)
    case '23514': case '23P01': case 'P0001':
      return new DataError(cleanCheck(msg), err.code)
    case '22P02': case '22007': case '22008':
      return new DataError('One of the values is in an invalid format.', err.code)
    case 'PGRST116':
      return new DataError('That record no longer exists.', err.code)
  }
  if (/row-level security/i.test(msg)) return new DataError("You don't have permission to do that.", '42501')
  if (/Failed to fetch|NetworkError|fetch failed/i.test(msg)) return new DataError('Network problem — check your connection and try again.', 'network')
  if (/JWT|session/i.test(msg)) return new DataError('Your session has expired. Please sign in again.', 'auth')
  return new DataError(msg.length < 200 ? msg : 'Something went wrong. Please try again.', err.code)
}

function cleanCheck(msg: string): string {
  const m = msg.match(/violates check constraint "(\w+)"/)
  if (!m) return msg
  const known: Record<string, string> = {
    projects_dates_ok: 'Delivery date must be on or after the start date.',
    bookings_time_ok: 'Shoot end time must be after the start time.',
    invoices_due_ok: 'Due date must be on or after the issue date.',
    enquiries_contact_required: 'Add a phone number or email.',
    payments_linked: 'A payment must be linked to an invoice or a project.',
    invoices_percent_ok: 'A percentage discount cannot exceed 100%.',
  }
  return known[m[1]] ?? 'Some values are outside the allowed range.'
}
