// Row types mirror supabase/migrations/*.sql exactly. Money comes back from PostgREST
// as a number (numeric → JSON number), dates as 'YYYY-MM-DD', timestamps as ISO strings.

export type UUID = string
export type ISODate = string
export type ISODateTime = string

export type AppRole = 'owner' | 'manager' | 'editor' | 'videographer' | 'accounts'
export type EnquiryStatus = 'new' | 'contacted' | 'follow_up' | 'proposal_sent' | 'converted' | 'lost'
export type LeadSource = 'website' | 'instagram' | 'whatsapp' | 'referral' | 'google' | 'walk_in' | 'phone' | 'other'
export type ProjectStatus =
  | 'enquiry_received' | 'planning' | 'script_concept' | 'shoot_scheduled' | 'shooting'
  | 'editing' | 'client_review' | 'revisions' | 'approved' | 'delivered' | 'on_hold' | 'cancelled'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type ApprovalStatus = 'pending' | 'approved' | 'changes_requested'
export type BookingStatus = 'requested' | 'confirmed' | 'completed' | 'cancelled'
export type AdvanceStatus = 'not_required' | 'pending' | 'partial' | 'paid'
export type PricingModel = 'fixed' | 'starting_from' | 'per_hour' | 'per_day' | 'custom_quote'
export type ContentPlatform = 'instagram' | 'facebook' | 'youtube' | 'linkedin' | 'x' | 'website' | 'other'
export type ContentFormat = 'reel' | 'post' | 'carousel' | 'story' | 'video' | 'short' | 'blog' | 'other'
export type ContentStatus = 'idea' | 'draft' | 'in_review' | 'approved' | 'scheduled' | 'published'
export type InvoiceStatus = 'draft' | 'sent' | 'partially_paid' | 'paid' | 'overdue' | 'void'
export type DiscountType = 'flat' | 'percent'
export type PaymentMethod = 'upi' | 'bank_transfer' | 'cash' | 'card' | 'cheque' | 'other'
export type TestimonialStatus = 'pending' | 'approved' | 'rejected'
export type Availability = 'available' | 'busy' | 'on_leave'
export type ClientType = 'individual' | 'business' | 'agency' | 'institution'

interface Timestamps { created_at: ISODateTime; updated_at: ISODateTime }

export interface Profile extends Timestamps {
  id: UUID; email: string; full_name: string; avatar_url: string | null
  role: AppRole | null; is_active: boolean
}

export interface TeamMember extends Timestamps {
  id: UUID; profile_id: UUID | null; full_name: string; email: string | null; phone: string | null
  role: AppRole; designation: string | null; skills: string[]; availability: Availability
  avatar_url: string | null; is_active: boolean
}

export interface Service extends Timestamps {
  id: UUID; title: string; slug: string; description: string | null; thumbnail_url: string | null
  pricing_model: PricingModel; starting_price: number | null; delivery_estimate: string | null
  is_active: boolean; sort_order: number
}

export interface Client extends Timestamps {
  id: UUID; name: string; business_name: string | null; email: string | null; phone: string | null
  whatsapp: string | null; client_type: ClientType; address: string | null; city: string | null
  gstin: string | null; notes: string | null
}

export interface Enquiry extends Timestamps {
  id: UUID; code: string; client_name: string; business_name: string | null; phone: string | null
  email: string | null; service_id: UUID | null; service_label: string | null; budget: number | null
  lead_source: LeadSource; enquiry_date: ISODate; follow_up_date: ISODate | null; assigned_to: UUID | null
  notes: string | null; status: EnquiryStatus; client_id: UUID | null; project_id: UUID | null
  submitted_via: 'admin' | 'website'; submission_fingerprint: string | null
}

export interface EnquiryFollowup extends Timestamps {
  id: UUID; enquiry_id: UUID; note: string; channel: 'call' | 'whatsapp' | 'email' | 'meeting' | 'other'
  next_follow_up: ISODate | null; created_by: UUID | null
}

export interface Project extends Timestamps {
  id: UUID; code: string; name: string; client_id: UUID | null; service_id: UUID | null
  service_label: string | null; description: string | null; start_date: ISODate | null
  delivery_date: ISODate | null; priority: Priority; status: ProjectStatus
  approval_status: ApprovalStatus; revision_count: number; internal_notes: string | null
  enquiry_id: UUID | null
}

export interface ProjectFinancials {
  project_id: UUID; budget: number; advance_paid: number; amount_received: number; amount_due: number
  updated_at: ISODateTime
}

export interface ProjectTeamMember { project_id: UUID; team_member_id: UUID; role_on_project: string | null; created_at: ISODateTime }

export interface ProjectTask extends Timestamps {
  id: UUID; project_id: UUID; title: string; kind: 'deliverable' | 'task' | 'revision'; is_done: boolean
  due_date: ISODate | null; assigned_to: UUID | null; sort_order: number
}

export interface Booking extends Timestamps {
  id: UUID; code: string; title: string; client_id: UUID | null; project_id: UUID | null
  contact_name: string | null; contact_phone: string | null; contact_email: string | null
  shoot_type: string | null; start_at: ISODateTime; end_at: ISODateTime; location: string | null
  equipment: string[]; status: BookingStatus; advance_status: AdvanceStatus; internal_notes: string | null
  submitted_via: 'admin' | 'website'; submission_fingerprint: string | null
}

export interface BookingCrew { booking_id: UUID; team_member_id: UUID; created_at: ISODateTime }

export interface PortfolioItem extends Timestamps {
  id: UUID; title: string; description: string | null; category: string; client_name: string | null
  service_id: UUID | null; duration_seconds: number | null; video_url: string | null
  video_provider: 'youtube' | 'vimeo' | 'upload' | 'other' | null; thumbnail_url: string | null
  media_url: string | null; is_featured: boolean; is_published: boolean; sort_order: number
}

export interface Testimonial extends Timestamps {
  id: UUID; client_name: string; company: string | null; avatar_url: string | null; content: string
  rating: number; status: TestimonialStatus; is_featured: boolean; sort_order: number; client_id: UUID | null
}

export interface ContentItem extends Timestamps {
  id: UUID; title: string; platform: ContentPlatform; format: ContentFormat; caption: string | null
  hashtags: string[]; scheduled_at: ISODateTime | null; assigned_to: UUID | null; status: ContentStatus
  project_id: UUID | null; client_id: UUID | null
}

export interface Invoice extends Timestamps {
  id: UUID; invoice_number: string; client_id: UUID; project_id: UUID | null; issue_date: ISODate
  due_date: ISODate | null; status: InvoiceStatus; discount_type: DiscountType; discount_value: number
  tax_label: string; tax_rate: number; subtotal: number; discount_amount: number; tax_amount: number
  total: number; amount_paid: number; balance_due: number; notes: string | null; terms: string | null
}

export interface InvoiceItem extends Timestamps {
  id: UUID; invoice_id: UUID; description: string; quantity: number; unit_price: number; amount: number
  sort_order: number
}

export interface Payment extends Timestamps {
  id: UUID; client_id: UUID | null; invoice_id: UUID | null; project_id: UUID | null; amount: number
  paid_on: ISODate; method: PaymentMethod; reference: string | null; is_advance: boolean; notes: string | null
}

export interface Expense extends Timestamps {
  id: UUID; category: string; description: string; amount: number; spent_on: ISODate; vendor: string | null
  project_id: UUID | null; payment_method: PaymentMethod; receipt_path: string | null
}

export interface AppNotification extends Timestamps {
  id: UUID; recipient_id: UUID | null; title: string; body: string | null; kind: string
  link: string | null; read_at: ISODateTime | null
}

export interface ActivityLog {
  id: UUID; actor_id: UUID | null; entity_type: string; entity_id: UUID | null
  action: 'created' | 'updated' | 'deleted' | 'status_changed' | 'converted' | 'submitted'
  summary: string | null; created_at: ISODateTime
}

export interface StudioSettings {
  id: 1; studio_name: string; email: string | null; phone: string | null; whatsapp: string | null
  address: string | null; website: string | null; logo_url: string | null; primary_color: string
  accent_color: string; currency: string; timezone: string; invoice_prefix: string
  next_invoice_number: number; default_tax_rate: number; tax_label: string; gstin: string | null
  invoice_terms: string | null
  notification_prefs: { new_enquiry: boolean; booking_request: boolean; payment_received: boolean; invoice_overdue: boolean }
  session_timeout_minutes: number; updated_at: ISODateTime
}

/** Every table the app reads, keyed by its Postgres name. */
export interface Tables {
  profiles: Profile
  team_members: TeamMember
  services: Service
  clients: Client
  enquiries: Enquiry
  enquiry_followups: EnquiryFollowup
  projects: Project
  project_financials: ProjectFinancials
  project_team_members: ProjectTeamMember
  project_tasks: ProjectTask
  bookings: Booking
  booking_crew: BookingCrew
  portfolio_items: PortfolioItem
  testimonials: Testimonial
  content_calendar: ContentItem
  invoices: Invoice
  invoice_items: InvoiceItem
  payments: Payment
  expenses: Expense
  notifications: AppNotification
  activity_logs: ActivityLog
  studio_settings: StudioSettings
}
export type TableName = keyof Tables
export type Row<T extends TableName> = Tables[T]
/** Columns the database fills in (ids, codes, timestamps, computed money). */
export type Insert<T extends TableName> = Partial<Row<T>>
