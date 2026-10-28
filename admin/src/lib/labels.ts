import type {
  AdvanceStatus, AppRole, ApprovalStatus, Availability, BookingStatus, ContentFormat, ContentPlatform, ContentStatus,
  EnquiryStatus, InvoiceStatus, LeadSource, PaymentMethod, PricingModel, Priority, ProjectStatus, TestimonialStatus, ClientType,
} from '@/types/db'

export type Tone = 'blue' | 'amber' | 'green' | 'red' | 'gray' | 'violet' | 'pink' | 'cyan'
type Meta = { label: string; tone: Tone }
const m = (label: string, tone: Tone): Meta => ({ label, tone })

export const ENQUIRY_STATUS: Record<EnquiryStatus, Meta> = {
  new: m('New', 'blue'), contacted: m('Contacted', 'cyan'), follow_up: m('Follow-up', 'amber'),
  proposal_sent: m('Proposal Sent', 'violet'), converted: m('Converted', 'green'), lost: m('Lost', 'gray'),
}
export const LEAD_SOURCE: Record<LeadSource, string> = {
  website: 'Website', instagram: 'Instagram', whatsapp: 'WhatsApp', referral: 'Referral', google: 'Google',
  walk_in: 'Walk-in', phone: 'Phone call', other: 'Other',
}
/** Production workflow in order (on_hold/cancelled sit outside the pipeline). */
export const PROJECT_FLOW: ProjectStatus[] = [
  'enquiry_received', 'planning', 'script_concept', 'shoot_scheduled', 'shooting', 'editing',
  'client_review', 'revisions', 'approved', 'delivered',
]
export const PROJECT_STATUS: Record<ProjectStatus, Meta> = {
  enquiry_received: m('Enquiry Received', 'blue'), planning: m('Planning', 'cyan'), script_concept: m('Script & Concept', 'violet'),
  shoot_scheduled: m('Shoot Scheduled', 'amber'), shooting: m('Shooting', 'pink'), editing: m('Editing', 'pink'),
  client_review: m('Client Review', 'amber'), revisions: m('Revisions', 'red'), approved: m('Approved', 'green'),
  delivered: m('Delivered', 'green'), on_hold: m('On Hold', 'gray'), cancelled: m('Cancelled', 'gray'),
}
export function projectProgress(s: ProjectStatus): number {
  const i = PROJECT_FLOW.indexOf(s)
  return i < 0 ? 0 : Math.round((i / (PROJECT_FLOW.length - 1)) * 100)
}
export const PRIORITY: Record<Priority, Meta> = {
  low: m('Low', 'gray'), medium: m('Medium', 'blue'), high: m('High', 'amber'), urgent: m('Urgent', 'red'),
}
export const APPROVAL: Record<ApprovalStatus, Meta> = {
  pending: m('Awaiting approval', 'amber'), approved: m('Client approved', 'green'), changes_requested: m('Changes requested', 'red'),
}
export const BOOKING_STATUS: Record<BookingStatus, Meta> = {
  requested: m('Requested', 'amber'), confirmed: m('Confirmed', 'green'), completed: m('Completed', 'blue'), cancelled: m('Cancelled', 'gray'),
}
export const ADVANCE_STATUS: Record<AdvanceStatus, Meta> = {
  not_required: m('Not required', 'gray'), pending: m('Advance pending', 'amber'), partial: m('Partly paid', 'cyan'), paid: m('Advance paid', 'green'),
}
export const PRICING_MODEL: Record<PricingModel, string> = {
  fixed: 'Fixed price', starting_from: 'Starting from', per_hour: 'Per hour', per_day: 'Per day', custom_quote: 'Custom quote',
}
export const CONTENT_PLATFORM: Record<ContentPlatform, string> = {
  instagram: 'Instagram', facebook: 'Facebook', youtube: 'YouTube', linkedin: 'LinkedIn', x: 'X', website: 'Website', other: 'Other',
}
export const PLATFORM_COLOR: Record<ContentPlatform, string> = {
  instagram: '#FF1744', facebook: '#3B82F6', youtube: '#EF4444', linkedin: '#0EA5E9', x: '#E5E5E5', website: '#A78BFA', other: '#A0A0A0',
}
export const CONTENT_FORMAT: Record<ContentFormat, string> = {
  reel: 'Reel', post: 'Post', carousel: 'Carousel', story: 'Story', video: 'Long video', short: 'Short', blog: 'Blog', other: 'Other',
}
export const CONTENT_STATUS: Record<ContentStatus, Meta> = {
  idea: m('Idea', 'gray'), draft: m('Draft', 'blue'), in_review: m('In Review', 'amber'), approved: m('Approved', 'cyan'),
  scheduled: m('Scheduled', 'violet'), published: m('Published', 'green'),
}
export const INVOICE_STATUS: Record<InvoiceStatus, Meta> = {
  draft: m('Draft', 'gray'), sent: m('Sent', 'blue'), partially_paid: m('Partially paid', 'amber'), paid: m('Paid', 'green'),
  overdue: m('Overdue', 'red'), void: m('Void', 'gray'),
}
export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  upi: 'UPI', bank_transfer: 'Bank transfer', cash: 'Cash', card: 'Card', cheque: 'Cheque', other: 'Other',
}
export const TESTIMONIAL_STATUS: Record<TestimonialStatus, Meta> = {
  pending: m('Pending', 'amber'), approved: m('Approved', 'green'), rejected: m('Rejected', 'gray'),
}
export const AVAILABILITY: Record<Availability, Meta> = {
  available: m('Available', 'green'), busy: m('Busy', 'amber'), on_leave: m('On leave', 'gray'),
}
export const ROLE_LABEL: Record<AppRole, string> = {
  owner: 'Owner / Admin', manager: 'Manager', editor: 'Editor', videographer: 'Videographer', accounts: 'Accounts',
}
export const CLIENT_TYPE: Record<ClientType, string> = {
  individual: 'Individual', business: 'Business', agency: 'Agency', institution: 'Institution',
}
export const EXPENSE_CATEGORIES = ['Equipment', 'Equipment rental', 'Travel', 'Crew & freelancers', 'Studio rent', 'Software', 'Marketing', 'Props & sets', 'Food', 'Utilities', 'Other']
export const PORTFOLIO_CATEGORIES = ['Brand Film', 'Instagram Reel', 'Product Video', 'Corporate Video', 'Event Coverage', 'Social Media', 'Photography', 'Music Video']
export const SHOOT_TYPES = ['Promo shoot', 'Reels shoot', 'Product shoot', 'Brand film', 'Corporate shoot', 'Event coverage', 'Photography', 'Interview']

export function enumOptions<T extends string>(rec: Record<T, Meta | string>) {
  return (Object.keys(rec) as T[]).map((value) => ({ value, label: typeof rec[value] === 'string' ? (rec[value] as string) : (rec[value] as Meta).label }))
}
