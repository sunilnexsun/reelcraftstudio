/**
 * SAMPLE DATA for demo mode only. Every person, business and amount here is fictional and is
 * generated relative to today's date so calendars and charts always have something to show.
 * None of it is ever written to Supabase.
 */
import { addDays, format, parseISO } from 'date-fns'
import type {
  AppRole, Booking, BookingCrew, Client, ContentItem, Enquiry, EnquiryFollowup, Expense, Invoice, InvoiceItem,
  Payment, PortfolioItem, Profile, Project, ProjectFinancials, ProjectTask, ProjectTeamMember, Service, StudioSettings,
  TeamMember, Testimonial, AppNotification, ActivityLog, ProjectStatus, EnquiryStatus, LeadSource,
} from '@/types/db'
import { computeInvoiceTotals, deriveInvoiceStatus } from '@/lib/domain/invoice'
import { istInputToISO, todayIST } from '@/lib/domain/dates'
import { round2 } from '@/lib/domain/money'
import { placeholderArt } from '@/lib/art'

// deterministic PRNG so the demo looks the same on every reset
function mulberry32(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

export const DEMO_USERS: { role: AppRole; name: string; email: string; designation: string }[] = [
  { role: 'owner', name: 'Vikram Raj', email: 'owner@demo.reelcraft.studio', designation: 'Founder & Creative Director' },
  { role: 'manager', name: 'Divya Menon', email: 'manager@demo.reelcraft.studio', designation: 'Studio Manager' },
  { role: 'editor', name: 'Rahul Dev', email: 'editor@demo.reelcraft.studio', designation: 'Lead Video Editor' },
  { role: 'videographer', name: 'Sathish Kumar', email: 'camera@demo.reelcraft.studio', designation: 'Cinematographer' },
  { role: 'accounts', name: 'Lakshmi N', email: 'accounts@demo.reelcraft.studio', designation: 'Accounts Executive' },
]

export function buildSeed() {
  const rnd = mulberry32(20261026)
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rnd() * xs.length)]
  const int = (a: number, b: number) => Math.floor(a + rnd() * (b - a + 1))
  const today = parseISO(todayIST())
  const d = (offset: number) => format(addDays(today, offset), 'yyyy-MM-dd')
  const dt = (offset: number, hhmm: string) => istInputToISO(`${d(offset)}T${hhmm}`)
  const ts = (offset: number, hhmm = '10:30') => dt(offset, hhmm)
  const id = () => crypto.randomUUID()

  // ───── studio settings ─────
  const settings: StudioSettings = {
    id: 1, studio_name: 'ReelCraft Studio', email: 'hello@reelcraft.studio', phone: '+91 98400 12345', whatsapp: '+91 98400 12345',
    address: '12 Gandhi Road, Sivakasi, Tamil Nadu 626123', website: 'https://reelcraft.studio', logo_url: null,
    primary_color: '#0A0A0A', accent_color: '#FF1744', currency: 'INR', timezone: 'Asia/Kolkata', invoice_prefix: 'RC-',
    next_invoice_number: 1, default_tax_rate: 18, tax_label: 'GST', gstin: '33ABCDE1234F1Z5',
    invoice_terms: 'Payment due within 15 days. 50% advance required to confirm shoot dates.',
    notification_prefs: { new_enquiry: true, booking_request: true, payment_received: true, invoice_overdue: true },
    session_timeout_minutes: 480, updated_at: ts(-30),
  }

  // ───── people ─────
  const profiles: Profile[] = DEMO_USERS.map((u) => ({
    id: id(), email: u.email, full_name: u.name, avatar_url: null, role: u.role, is_active: true, created_at: ts(-200), updated_at: ts(-200),
  }))
  profiles.push({ id: id(), email: 'new.hire@demo.reelcraft.studio', full_name: 'Arjun P', avatar_url: null, role: null, is_active: false, created_at: ts(-2), updated_at: ts(-2) })

  const team: TeamMember[] = [
    ...DEMO_USERS.map((u, i) => ({
      id: id(), profile_id: profiles[i].id, full_name: u.name, email: u.email, phone: `+91 9${int(100000000, 999999999)}`,
      role: u.role, designation: u.designation, skills: ({ owner: ['Direction', 'Client pitching'], manager: ['Scheduling', 'Production'], editor: ['Premiere Pro', 'DaVinci Resolve', 'Motion graphics'], videographer: ['Sony FX3', 'Gimbal', 'Drone'], accounts: ['Tally', 'GST filing'] } as Record<AppRole, string[]>)[u.role],
      availability: 'available' as const, avatar_url: null, is_active: true, created_at: ts(-200), updated_at: ts(-200),
    })),
    { id: id(), profile_id: null, full_name: 'Naveen J', email: 'naveen@reelcraft.studio', phone: '+91 97900 22110', role: 'videographer', designation: 'Camera Assistant & Drone Pilot', skills: ['Drone', 'Lighting'], availability: 'busy', avatar_url: null, is_active: true, created_at: ts(-150), updated_at: ts(-20) },
    { id: id(), profile_id: null, full_name: 'Keerthana R', email: 'keerthana@reelcraft.studio', phone: '+91 96000 33445', role: 'editor', designation: 'Social Media Editor', skills: ['Reels', 'CapCut', 'After Effects'], availability: 'available', avatar_url: null, is_active: true, created_at: ts(-120), updated_at: ts(-20) },
  ]
  const [tOwner, tManager, tEditor, tCam, , tDrone, tSocial] = team

  // ───── services ─────
  const svcDefs: [string, string, Service['pricing_model'], number | null, string, string][] = [
    ['Video Shooting & Editing', 'video-shooting-editing', 'starting_from', 15000, '7–10 days', 'End-to-end shoot and edit for any format.'],
    ['Instagram Reels', 'instagram-reels', 'starting_from', 4999, '3–5 days', 'Scroll-stopping vertical reels with trending edits.'],
    ['Product & Promotional Videos', 'product-promotional-videos', 'starting_from', 12000, '5–7 days', 'Studio and lifestyle product films.'],
    ['Social Media Content', 'social-media-content', 'per_day', 18000, 'Monthly retainer', 'Monthly content days: reels, posts and stories.'],
    ['Brand Films', 'brand-films', 'starting_from', 45000, '2–3 weeks', 'Cinematic brand stories with scripting and direction.'],
    ['Corporate Videos', 'corporate-videos', 'starting_from', 30000, '10–14 days', 'Company profiles, testimonials and training films.'],
    ['Event Coverage', 'event-coverage', 'per_day', 25000, '7 days', 'Multi-camera coverage with same-week highlights.'],
    ['Photography', 'photography', 'per_hour', 2500, '3 days', 'Product, team and event photography.'],
  ]
  const services: Service[] = svcDefs.map(([title, slug, pricing_model, starting_price, delivery_estimate, description], i) => ({
    id: id(), title, slug, description, thumbnail_url: placeholderArt(slug), pricing_model, starting_price, delivery_estimate,
    is_active: true, sort_order: i, created_at: ts(-300), updated_at: ts(-300),
  }))
  const svc = (slug: string) => services.find((s) => s.slug === slug)!

  // ───── clients ─────
  const clientDefs: [string, string | null, string, Client['client_type'], string][] = [
    ['Ramesh Babu', 'FitZone Gym', 'Sivakasi', 'business', 'fitzone'],
    ['Farhana K', 'Spice House Restaurant', 'Kovilpatti', 'business', 'spicehouse'],
    ['Dr. Pranav S', 'Pranav Global School', 'Chennai', 'institution', 'pranavschool'],
    ['Meena Lakshmi', 'Lakshmi Silks', 'Madurai', 'business', 'lakshmisilks'],
    ['Joseph A', 'Coastal Realty', 'Tuticorin', 'business', 'coastalrealty'],
    ['Anitha V', 'Glow Skin Clinic', 'Virudhunagar', 'business', 'glowclinic'],
    ['Suresh M', 'Kalam Fireworks', 'Sivakasi', 'business', 'kalamfireworks'],
    ['Pooja R', null, 'Sivakasi', 'individual', 'pooja'],
    ['Hari Prasad', 'BrewBox Café', 'Madurai', 'business', 'brewbox'],
    ['Nisha T', 'Pixel Bloom Agency', 'Chennai', 'agency', 'pixelbloom'],
  ]
  const clients: Client[] = clientDefs.map(([name, business_name, city, client_type, handle], i) => ({
    id: id(), name, business_name, email: `${handle}@example.in`, phone: `+91 9${String(8400000000 + i * 1234567).slice(1)}`,
    whatsapp: `+91 9${String(8400000000 + i * 1234567).slice(1)}`, client_type, address: null, city, gstin: client_type === 'business' && i % 2 === 0 ? `33AAAC${String(1000 + i)}Q1Z${i}` : null,
    notes: i === 0 ? 'Prefers WhatsApp. Shoots must finish before 11 AM (gym peak hours).' : null, created_at: ts(-180 + i * 9), updated_at: ts(-60),
  }))

  // ───── projects ─────
  type PDef = [number, string, string, ProjectStatus, number, number, number, Project['priority']]
  // [client idx, name, service slug, status, start offset, delivery offset, budget, priority]
  const pdefs: PDef[] = [
    [0, 'FitZone Gym — Promo Shoot', 'product-promotional-videos', 'shoot_scheduled', -6, 9, 35000, 'high'],
    [1, 'Spice House — Food Promo', 'instagram-reels', 'shoot_scheduled', -4, 10, 18000, 'medium'],
    [2, 'Pranav Global School — Brand Film', 'brand-films', 'script_concept', -10, 25, 85000, 'high'],
    [3, 'Lakshmi Silks — Festive Collection', 'product-promotional-videos', 'editing', -20, 4, 42000, 'urgent'],
    [4, 'Coastal Realty — Villa Walkthroughs', 'video-shooting-editing', 'client_review', -25, 2, 28000, 'medium'],
    [5, 'Glow Skin Clinic — Reels Pack (12)', 'instagram-reels', 'revisions', -18, 3, 36000, 'high'],
    [6, 'Kalam Fireworks — Diwali Campaign', 'brand-films', 'delivered', -60, -12, 120000, 'urgent'],
    [7, 'Pooja — Birthday Event Coverage', 'event-coverage', 'delivered', -40, -30, 25000, 'low'],
    [8, 'BrewBox Café — Monthly Content', 'social-media-content', 'shooting', -3, 12, 54000, 'medium'],
    [9, 'Pixel Bloom — Client Testimonials', 'corporate-videos', 'planning', 2, 20, 40000, 'medium'],
    [0, 'FitZone — Trainer Profiles', 'photography', 'approved', -15, -1, 12000, 'low'],
    [3, 'Lakshmi Silks — Catalogue Photography', 'photography', 'delivered', -75, -55, 30000, 'medium'],
    [1, 'Spice House — Menu Launch Reels', 'instagram-reels', 'delivered', -50, -38, 15000, 'medium'],
    [6, 'Kalam Fireworks — Factory Safety Film', 'corporate-videos', 'on_hold', -30, 30, 60000, 'low'],
    [2, 'Pranav School — Annual Day', 'event-coverage', 'delivered', -95, -85, 45000, 'medium'],
    [5, 'Glow Skin Clinic — Before/After Series', 'social-media-content', 'delivered', -120, -100, 32000, 'low'],
    [4, 'Coastal Realty — Drone Showcase', 'video-shooting-editing', 'enquiry_received', 5, 30, 22000, 'medium'],
    [8, 'BrewBox — Barista Stories', 'brand-films', 'editing', -14, 6, 48000, 'high'],
  ]
  const projects: Project[] = pdefs.map(([ci, name, slug, status, so, dso, , priority], i) => ({
    id: id(), code: `PRJ-${String(i + 1).padStart(4, '0')}`, name, client_id: clients[ci].id, service_id: svc(slug).id,
    service_label: svc(slug).title, description: `${svc(slug).description} Deliverables agreed on the kickoff call.`,
    start_date: d(so), delivery_date: d(dso), priority, status,
    approval_status: status === 'delivered' || status === 'approved' ? 'approved' : status === 'revisions' ? 'changes_requested' : 'pending',
    revision_count: status === 'revisions' ? 2 : status === 'delivered' ? int(0, 2) : 0,
    internal_notes: i === 3 ? 'Client wants a 30s and a 15s cut. Use festive LUT pack.' : null, enquiry_id: null,
    created_at: ts(so - 3), updated_at: ts(Math.min(-1, dso)),
  }))
  const project_team_members: ProjectTeamMember[] = []
  projects.forEach((p, i) => {
    const crew = [tManager, i % 3 === 0 ? tSocial : tEditor, i % 2 === 0 ? tCam : tDrone]
    if (i % 4 === 0) crew.push(tOwner)
    for (const m of crew) project_team_members.push({ project_id: p.id, team_member_id: m.id, role_on_project: null, created_at: p.created_at })
  })
  const project_tasks: ProjectTask[] = []
  const flowDone: Record<string, number> = { enquiry_received: 0, planning: 1, script_concept: 1, shoot_scheduled: 2, shooting: 2, editing: 3, client_review: 4, revisions: 4, approved: 5, delivered: 5, on_hold: 1, cancelled: 0 }
  projects.forEach((p) => {
    const titles = ['Creative brief & moodboard', 'Script / shot list approved', 'Shoot completed', 'First cut delivered', 'Final masters exported (4K + vertical)']
    titles.forEach((title, k) => project_tasks.push({
      id: id(), project_id: p.id, title, kind: 'deliverable', is_done: k < flowDone[p.status], due_date: null,
      assigned_to: null, sort_order: k, created_at: p.created_at, updated_at: p.updated_at,
    }))
    if (p.status === 'revisions') {
      project_tasks.push({ id: id(), project_id: p.id, title: 'Revision 1: brighter skin tones, swap music', kind: 'revision', is_done: true, due_date: d(-4), assigned_to: tEditor.id, sort_order: 10, created_at: ts(-6), updated_at: ts(-4) })
      project_tasks.push({ id: id(), project_id: p.id, title: 'Revision 2: add Tamil subtitles to reels 4–8', kind: 'revision', is_done: false, due_date: d(2), assigned_to: tSocial.id, sort_order: 11, created_at: ts(-2), updated_at: ts(-2) })
    }
  })

  // ───── enquiries (last ~90 days, denser recently) ─────
  const names = ['Arun Kumar', 'Priya S', 'Mahesh R', 'Swapna D', 'Karthik V', 'Deepa M', 'Gokul R', 'Janani P', 'Imran S', 'Revathi K', 'Bala Murugan', 'Sneha J', 'Vignesh T', 'Asha G', 'Prakash L', 'Fathima B', 'Manoj K', 'Kavya S', 'Senthil R', 'Harini V', 'Ajith M', 'Nandhini A', 'Rajesh P', 'Saranya D']
  const bizz = ['Arun Textiles', null, 'Mahesh Motors', 'Swapna Bakes', 'KV Constructions', 'Deepa Boutique', null, 'Janani Dance Academy', 'Imran Mobiles', null, 'BM Jewellers', 'Sneha Yoga', 'VT Tech', null, 'Prakash Sweets', 'Fathima Fashions', null, 'Kavya Interiors', 'SR Hardware', null, 'AM Fitness', 'Nandhini Hospital', 'RP Logistics', 'Saranya Salon']
  const sources: LeadSource[] = ['website', 'website', 'instagram', 'instagram', 'whatsapp', 'referral', 'google', 'walk_in', 'phone']
  const enquiries: Enquiry[] = []
  const enqServices = ['product-promotional-videos', 'social-media-content', 'brand-films', 'event-coverage', 'corporate-videos', 'instagram-reels', 'photography', 'video-shooting-editing']
  // the five most recent mirror the reference dashboard
  const fixed: [string, string, number, EnquiryStatus][] = [
    ['Arun Kumar', 'product-promotional-videos', 0, 'new'], ['Priya S', 'social-media-content', 0, 'contacted'],
    ['Mahesh R', 'brand-films', -1, 'new'], ['Swapna D', 'event-coverage', -2, 'converted'], ['Karthik V', 'corporate-videos', -2, 'proposal_sent'],
  ]
  let ec = 0
  const mkEnquiry = (name: string, biz: string | null, slug: string, offset: number, status: EnquiryStatus, source: LeadSource): Enquiry => {
    ec++
    const s = svc(slug)
    const handle = name.toLowerCase().replace(/[^a-z]+/g, '.')
    return {
      id: id(), code: `ENQ-${String(ec).padStart(4, '0')}`, client_name: name, business_name: biz,
      phone: `+91 9${int(100000000, 999999999)}`, email: rnd() > 0.25 ? `${handle}@example.in` : null,
      service_id: s.id, service_label: s.title, budget: Math.round((s.starting_price ?? 10000) * (1 + rnd() * 2) / 500) * 500,
      lead_source: source, enquiry_date: d(offset), follow_up_date: ['new', 'contacted', 'follow_up', 'proposal_sent'].includes(status) ? d(offset + int(1, 6)) : null,
      assigned_to: pick([tManager.id, tOwner.id, null]), notes: pick([
        'Looking for a 60s promo for Instagram and YouTube.', 'Wants pricing for a monthly reels package.', 'Needs the video before the festival season.',
        'Referred by FitZone Gym. Budget flexible.', 'Asked for portfolio samples on WhatsApp.', null,
      ]), status, client_id: null, project_id: null, submitted_via: source === 'website' ? 'website' : 'admin', submission_fingerprint: null,
      created_at: ts(offset, `${String(int(9, 19)).padStart(2, '0')}:${pick(['05', '20', '35', '50'])}`), updated_at: ts(Math.min(0, offset + 1)),
    }
  }
  fixed.forEach(([n, slug, off, st], i) => enquiries.push(mkEnquiry(n, bizz[i], slug, off, st, i === 0 ? 'website' : sources[i])))
  for (let off = -3; off >= -88; off -= rnd() > 0.55 ? 1 : int(2, 3)) {
    const perDay = off > -8 ? int(2, 4) : int(0, 2)
    for (let k = 0; k < perDay; k++) {
      const age = -off
      const st: EnquiryStatus = age < 6 ? pick(['new', 'contacted', 'follow_up']) : age < 20 ? pick(['contacted', 'follow_up', 'proposal_sent', 'converted', 'lost']) : pick(['converted', 'converted', 'lost', 'lost', 'proposal_sent'])
      const ni = int(5, names.length - 1)
      enquiries.push(mkEnquiry(names[ni], bizz[ni], pick(enqServices), off, st, pick(sources)))
    }
  }
  // link a few converted enquiries to real projects/clients
  enquiries.filter((e) => e.status === 'converted').slice(0, projects.length).forEach((e, i) => {
    const p = projects[(i + 2) % projects.length]
    e.project_id = p.id; e.client_id = p.client_id
  })
  const enquiry_followups: EnquiryFollowup[] = []
  for (const e of enquiries.filter((x) => x.status !== 'new').slice(0, 30)) {
    enquiry_followups.push({ id: id(), enquiry_id: e.id, note: pick(['Called — interested, wants a quote by Friday.', 'Shared portfolio links on WhatsApp.', 'Sent proposal PDF with 2 package options.', 'Client comparing with another studio; follow up next week.']), channel: pick(['call', 'whatsapp', 'email', 'meeting']), next_follow_up: e.follow_up_date, created_by: profiles[1].id, created_at: e.updated_at, updated_at: e.updated_at })
  }

  // ───── bookings ─────
  const bookings: Booking[] = []
  const booking_crew: BookingCrew[] = []
  let bc = 0
  const mkBooking = (title: string, pi: number | null, ci: number | null, off: number, from: string, to: string, status: Booking['status'], loc: string, type: string, eq: string[], crew: TeamMember[], adv: Booking['advance_status'], created: number) => {
    bc++
    const b: Booking = {
      id: id(), code: `BK-${String(bc).padStart(4, '0')}`, title, client_id: ci == null ? null : clients[ci].id, project_id: pi == null ? null : projects[pi].id,
      contact_name: null, contact_phone: null, contact_email: null, shoot_type: type, start_at: dt(off, from), end_at: dt(off, to),
      location: loc, equipment: eq, status, advance_status: adv, internal_notes: null, submitted_via: 'admin', submission_fingerprint: null,
      created_at: ts(created), updated_at: ts(created),
    }
    bookings.push(b)
    for (const m of crew) booking_crew.push({ booking_id: b.id, team_member_id: m.id, created_at: b.created_at })
    return b
  }
  mkBooking('FitZone Gym – Promo Shoot', 0, 0, 1, '09:00', '11:00', 'confirmed', 'Sivakasi', 'Promo shoot', ['Sony FX3 #1', 'Gimbal RS3', 'Aputure 300d'], [tCam, tDrone], 'paid', -5)
  mkBooking('Spice House – Food Promo', 1, 1, 2, '14:00', '17:00', 'confirmed', 'Kovilpatti', 'Product shoot', ['Sony FX3 #2', 'Macro lens 90mm', 'Aputure 300d'], [tCam, tSocial], 'partial', -4)
  mkBooking('Pranav Global School – Brand Film', 2, 2, 3, '10:00', '16:00', 'confirmed', 'Chennai', 'Brand film', ['Sony FX3 #1', 'DJI Mavic 3', 'Gimbal RS3'], [tCam, tDrone, tOwner], 'paid', -3)
  mkBooking('BrewBox Café – Content Day', 8, 8, 0, '08:00', '12:00', 'confirmed', 'Madurai', 'Reels shoot', ['Sony FX3 #2'], [tSocial], 'paid', -6)
  mkBooking('Coastal Realty – Drone Recce', 16, 4, 6, '07:00', '09:00', 'requested', 'Tuticorin', 'Promo shoot', ['DJI Mavic 3'], [tDrone], 'pending', -1)
  mkBooking('Pixel Bloom – Testimonial Interviews', 9, 9, 8, '11:00', '15:00', 'confirmed', 'Chennai', 'Interview', ['Sony FX3 #1', 'Rode Wireless Pro'], [tCam, tManager], 'pending', -1)
  mkBooking('Lakshmi Silks – Pickup Shots', 3, 3, -3, '10:00', '12:00', 'completed', 'Madurai', 'Product shoot', ['Sony FX3 #1'], [tCam], 'paid', -9)
  mkBooking('Glow Skin Clinic – Reels Batch 2', 5, 5, -6, '15:00', '18:00', 'completed', 'Virudhunagar', 'Reels shoot', ['Sony FX3 #2'], [tSocial, tCam], 'paid', -12)
  mkBooking('Kalam Fireworks – Factory Film', 13, 6, -9, '09:00', '13:00', 'cancelled', 'Sivakasi', 'Corporate shoot', [], [tCam], 'not_required', -15)
  for (let k = 0; k < 14; k++) {
    const off = -int(10, 85)
    const pi = int(0, projects.length - 1)
    mkBooking(`${projects[pi].name.split('—')[0].trim()} – Shoot`, pi, clients.findIndex((c) => c.id === projects[pi].client_id), off, '10:00', `${int(12, 17)}:00`, 'completed', clients.find((c) => c.id === projects[pi].client_id)!.city ?? 'Sivakasi', pick(['Promo shoot', 'Reels shoot', 'Event coverage']), [], [pick([tCam, tDrone])], 'paid', off - int(3, 10))
  }
  // a website booking request awaiting confirmation
  bc++
  bookings.push({
    id: id(), code: `BK-${String(bc).padStart(4, '0')}`, title: 'Shoot request — Gokul R', client_id: null, project_id: null,
    contact_name: 'Gokul R', contact_phone: '+91 98943 11223', contact_email: 'gokul.r@example.in', shoot_type: 'Event coverage',
    start_at: dt(12, '17:00'), end_at: dt(12, '21:00'), location: 'Sivakasi — Hotel Grand', equipment: [], status: 'requested',
    advance_status: 'pending', internal_notes: 'Engagement reception. Wants highlights reel within a week.', submitted_via: 'website',
    submission_fingerprint: null, created_at: ts(0, '08:40'), updated_at: ts(0, '08:40'),
  })

  // ───── invoices, items, payments ─────
  const invoices: Invoice[] = []
  const invoice_items: InvoiceItem[] = []
  const payments: Payment[] = []
  let invNo = 0
  const mkInvoice = (pi: number, issueOff: number, dueIn: number, lines: [string, number, number][], status: Invoice['status'], pays: [number, number, boolean][], discount: [Invoice['discount_type'], number] = ['flat', 0]) => {
    invNo++
    const p = projects[pi]
    const inv: Invoice = {
      id: id(), invoice_number: `RC-${todayIST().slice(2, 4)}-${String(invNo).padStart(4, '0')}`, client_id: p.client_id!, project_id: p.id,
      issue_date: d(issueOff), due_date: d(issueOff + dueIn), status, discount_type: discount[0], discount_value: discount[1],
      tax_label: 'GST', tax_rate: 18, subtotal: 0, discount_amount: 0, tax_amount: 0, total: 0, amount_paid: 0, balance_due: 0,
      notes: null, terms: settings.invoice_terms, created_at: ts(issueOff), updated_at: ts(issueOff),
    }
    lines.forEach(([description, quantity, unit_price], k) => invoice_items.push({ id: id(), invoice_id: inv.id, description, quantity, unit_price, amount: round2(quantity * unit_price), sort_order: k, created_at: inv.created_at, updated_at: inv.created_at }))
    const t0 = computeInvoiceTotals(lines.map(([, quantity, unit_price]) => ({ quantity, unit_price })), inv.discount_type, inv.discount_value, inv.tax_rate)
    for (const [frac, off, adv] of pays) {
      payments.push({ id: id(), client_id: p.client_id, invoice_id: inv.id, project_id: p.id, amount: round2(t0.total * frac), paid_on: d(off), method: pick(['upi', 'bank_transfer', 'upi', 'cash']), reference: `UTR${int(100000000, 999999999)}`, is_advance: adv, notes: adv ? 'Advance to confirm dates' : null, created_at: ts(off), updated_at: ts(off) })
    }
    const paid = payments.filter((x) => x.invoice_id === inv.id).reduce((s, x) => s + x.amount, 0)
    Object.assign(inv, computeInvoiceTotals(lines.map(([, quantity, unit_price]) => ({ quantity, unit_price })), inv.discount_type, inv.discount_value, inv.tax_rate, paid))
    inv.status = deriveInvoiceStatus(inv.status, inv.total, inv.amount_paid, inv.due_date, todayIST())
    invoices.push(inv)
  }
  mkInvoice(6, -58, 15, [['Diwali campaign film (90s) — concept, shoot, edit', 1, 75000], ['Cutdowns: 30s + 15s + 3 vertical reels', 1, 22000], ['Drone unit (1 day)', 1, 5000]], 'sent', [[0.5, -58, true], [0.5, -20, false]])
  mkInvoice(7, -32, 7, [['Birthday event coverage (4 hrs, 2 cameras)', 1, 18000], ['Highlights film (3 min)', 1, 3000]], 'sent', [[1, -28, false]])
  mkInvoice(11, -56, 15, [['Catalogue photography (120 SKUs)', 120, 200], ['Model shoot (half day)', 1, 6000]], 'sent', [[0.4, -60, true], [0.6, -40, false]])
  mkInvoice(12, -38, 15, [['Menu launch reels', 5, 2600]], 'sent', [[1, -30, false]], ['percent', 10])
  mkInvoice(14, -84, 15, [['Annual day — multi-camera coverage', 1, 32000], ['Full event edit + highlights', 1, 8000]], 'sent', [[1, -70, false]])
  mkInvoice(15, -98, 15, [['Before/after reels series', 8, 3500]], 'sent', [[1, -90, false]])
  mkInvoice(3, -12, 15, [['Festive collection film (60s)', 1, 30000], ['Vertical cutdowns', 4, 2000]], 'sent', [[0.5, -19, true]])
  mkInvoice(0, -5, 10, [['Gym promo film (45s) — shoot + edit', 1, 26000], ['Trainer reels', 3, 2500]], 'sent', [[0.5, -5, true]])
  mkInvoice(4, -27, 10, [['Villa walkthrough videos', 3, 8000], ['Drone add-on', 1, 4000]], 'sent', [])
  mkInvoice(5, -20, 15, [['Reels pack (12) — shoot + edit', 12, 2800]], 'sent', [[0.5, -18, true], [0.2, -6, false]])
  mkInvoice(10, -2, 15, [['Trainer profile photography', 1, 10000]], 'draft', [])
  mkInvoice(17, -14, 15, [['Barista stories brand film', 1, 40000]], 'sent', [[0.5, -14, true]])
  mkInvoice(8, -3, 15, [['October content day retainer', 1, 45000]], 'sent', [[0.3, -3, true]])
  // advance payment on a project before invoicing
  payments.push({ id: id(), client_id: projects[2].client_id, invoice_id: null, project_id: projects[2].id, amount: 30000, paid_on: d(-9), method: 'bank_transfer', reference: 'NEFT-PGS-0912', is_advance: true, notes: 'Advance for brand film (to be adjusted in final invoice)', created_at: ts(-9), updated_at: ts(-9) })
  settings.next_invoice_number = invNo + 1

  const project_financials: ProjectFinancials[] = projects.map((p, i) => {
    const pays = payments.filter((x) => x.project_id === p.id)
    const received = round2(pays.reduce((s, x) => s + x.amount, 0))
    const budget = Math.max(pdefs[i][6], received)
    return { project_id: p.id, budget, advance_paid: round2(pays.filter((x) => x.is_advance).reduce((s, x) => s + x.amount, 0)), amount_received: received, amount_due: Math.max(round2(budget - received), 0), updated_at: p.updated_at }
  })

  // ───── expenses ─────
  const expenses: Expense[] = []
  const expDefs: [string, string, number, number, string | null, number | null][] = [
    ['Studio rent', 'Studio rent — month', 22000, -1, 'Sri Balaji Properties', null], ['Studio rent', 'Studio rent — month', 22000, -31, 'Sri Balaji Properties', null], ['Studio rent', 'Studio rent — month', 22000, -61, 'Sri Balaji Properties', null],
    ['Software', 'Adobe Creative Cloud (team)', 6800, -4, 'Adobe', null], ['Software', 'Frame.io + Dropbox', 2400, -34, 'Dropbox', null],
    ['Equipment rental', 'Cine lens kit rental (2 days)', 9000, -10, 'Chennai Camera Rentals', 6], ['Travel', 'Chennai shoot travel + stay', 7400, -84, 'Redbus / Hotel', 14],
    ['Crew & freelancers', 'Freelance gaffer (1 day)', 3500, -9, 'Senthil (freelance)', 6], ['Crew & freelancers', 'Freelance makeup artist', 4000, -18, 'Glam by Revathi', 3],
    ['Props & sets', 'Festive props & florals', 5200, -19, 'Madurai Flower Market', 3], ['Food', 'Crew lunch — Spice House shoot', 1800, -1, 'Spice House', 1],
    ['Marketing', 'Instagram ads — portfolio boost', 5000, -14, 'Meta', null], ['Equipment', 'Aputure 300d light (purchase)', 54000, -45, 'Toptech Chennai', null],
    ['Utilities', 'Electricity + internet', 4600, -6, 'TNEB / ACT', null], ['Utilities', 'Electricity + internet', 4300, -36, 'TNEB / ACT', null], ['Travel', 'Fuel — Kovilpatti & Tuticorin', 2100, -3, 'Indian Oil', null],
  ]
  for (const [category, description, amount, off, vendor, pi] of expDefs) expenses.push({ id: id(), category, description, amount, spent_on: d(off), vendor, project_id: pi == null ? null : projects[pi].id, payment_method: pick(['upi', 'bank_transfer', 'card']), receipt_path: null, created_at: ts(off), updated_at: ts(off) })

  // ───── portfolio, testimonials, content ─────
  const portfolio_items: PortfolioItem[] = [
    ['Kalam Fireworks — Light Up Every Diwali', 'Brand Film', 'Kalam Fireworks', 92, true, true],
    ['Lakshmi Silks — Woven Stories', 'Product Video', 'Lakshmi Silks', 61, true, true],
    ['FitZone Gym — Stronger Every Day', 'Instagram Reel', 'FitZone Gym', 32, false, true],
    ['Spice House — Menu Launch', 'Instagram Reel', 'Spice House', 28, false, true],
    ['Pranav Global School — Annual Day 2026', 'Event Coverage', 'Pranav Global School', 214, true, true],
    ['Glow Skin Clinic — The Glow Up', 'Social Media', 'Glow Skin Clinic', 45, false, true],
    ['Coastal Realty — Sea View Villas', 'Corporate Video', 'Coastal Realty', 120, false, false],
  ].map(([title, category, client_name, dur, featured, published], i) => ({
    id: id(), title: title as string, description: 'Concept, shoot, edit and colour by ReelCraft Studio.', category: category as string,
    client_name: client_name as string, service_id: null, duration_seconds: dur as number, video_url: null, video_provider: null,
    thumbnail_url: placeholderArt(title as string, (category as string).toUpperCase()), media_url: null,
    is_featured: featured as boolean, is_published: published as boolean, sort_order: i, created_at: ts(-100 + i * 10), updated_at: ts(-20),
  }))
  const testimonials: Testimonial[] = [
    ['Suresh M', 'Kalam Fireworks', 'The Diwali film doubled our dealer enquiries. The team understood our brand instantly and delivered ahead of schedule.', 5, 'approved', true],
    ['Farhana K', 'Spice House Restaurant', 'Our menu launch reels went viral locally — 40k views in a week. Super easy to work with.', 5, 'approved', true],
    ['Dr. Pranav S', 'Pranav Global School', 'Professional crew, beautiful annual day coverage, and the highlights reel made every parent emotional.', 5, 'approved', false],
    ['Anitha V', 'Glow Skin Clinic', 'Consistent quality across 12 reels and quick revisions. Would recommend for any clinic.', 4, 'pending', false],
  ].map(([client_name, company, content, rating, status, featured], i) => ({
    id: id(), client_name: client_name as string, company: company as string, avatar_url: null, content: content as string,
    rating: rating as number, status: status as Testimonial['status'], is_featured: featured as boolean, sort_order: i,
    client_id: clients.find((c) => c.business_name === company)?.id ?? null, created_at: ts(-40 + i * 5), updated_at: ts(-10),
  }))
  const content_calendar: ContentItem[] = [
    ['Behind the scenes: FitZone shoot', 'instagram', 'reel', 1, 'scheduled', ['#BTS', '#ReelCraftStudio', '#Sivakasi']],
    ['Client spotlight: Spice House', 'instagram', 'carousel', 3, 'approved', ['#ClientLove', '#FoodVideography']],
    ['How we light food videos', 'youtube', 'short', 5, 'in_review', ['#Filmmaking', '#FoodFilm']],
    ['Diwali campaign case study', 'facebook', 'video', 7, 'draft', ['#Diwali', '#BrandFilm']],
    ['Gear Friday: our FX3 setup', 'instagram', 'post', 10, 'idea', ['#GearTalk']],
    ['Lakshmi Silks reel teaser', 'instagram', 'reel', -2, 'published', ['#Silk', '#Madurai']],
    ['Annual day highlights repost', 'youtube', 'video', -8, 'published', ['#SchoolEvents']],
    ['Wedding season offer', 'facebook', 'post', 14, 'idea', ['#WeddingFilms', '#Offer']],
    ['Team intro: meet our editors', 'linkedin', 'carousel', 4, 'draft', ['#Team', '#Hiring']],
  ].map(([title, platform, fmt, off, status, tags], i) => ({
    id: id(), title: title as string, platform: platform as ContentItem['platform'], format: fmt as ContentItem['format'],
    caption: 'Draft caption — edit before publishing.', hashtags: tags as string[], scheduled_at: dt(off as number, i % 2 ? '18:30' : '12:00'),
    assigned_to: i % 2 ? tSocial.id : tEditor.id, status: status as ContentItem['status'], project_id: null, client_id: null,
    created_at: ts(-12), updated_at: ts(-2),
  }))

  const notifications: AppNotification[] = [
    { id: id(), recipient_id: null, title: 'New website enquiry', body: 'Arun Kumar — Product & Promotional Videos', kind: 'enquiry', link: `/enquiries?open=${enquiries[0].id}`, read_at: null, created_at: enquiries[0].created_at, updated_at: enquiries[0].created_at },
    { id: id(), recipient_id: null, title: 'New booking request', body: 'Gokul R — engagement reception', kind: 'booking', link: `/bookings?open=${bookings[bookings.length - 1].id}`, read_at: null, created_at: ts(0, '08:40'), updated_at: ts(0, '08:40') },
    { id: id(), recipient_id: null, title: 'Invoice overdue', body: 'Coastal Realty — villa walkthroughs', kind: 'invoice', link: '/finance', read_at: null, created_at: ts(-1), updated_at: ts(-1) },
    { id: id(), recipient_id: null, title: 'Payment received', body: '₹13,500 from BrewBox Café', kind: 'payment', link: '/finance?tab=payments', read_at: ts(-2), created_at: ts(-3), updated_at: ts(-2) },
  ]
  const activity_logs: ActivityLog[] = [
    { id: id(), actor_id: profiles[2].id, entity_type: 'projects', entity_id: projects[3].id, action: 'status_changed', summary: `${projects[3].code} → editing`, created_at: ts(-1, '16:10') },
    { id: id(), actor_id: profiles[1].id, entity_type: 'bookings', entity_id: bookings[0].id, action: 'status_changed', summary: `${bookings[0].code} → confirmed`, created_at: ts(-1, '11:30') },
    { id: id(), actor_id: profiles[4].id, entity_type: 'payments', entity_id: payments[payments.length - 2]?.id ?? null, action: 'created', summary: 'Advance received — BrewBox Café', created_at: ts(-3, '15:00') },
    { id: id(), actor_id: profiles[0].id, entity_type: 'projects', entity_id: projects[5].id, action: 'status_changed', summary: `${projects[5].code} → revisions`, created_at: ts(-2, '18:20') },
    { id: id(), actor_id: null, entity_type: 'enquiries', entity_id: enquiries[0].id, action: 'submitted', summary: `${enquiries[0].code} received from website`, created_at: enquiries[0].created_at },
    { id: id(), actor_id: profiles[3].id, entity_type: 'bookings', entity_id: bookings[6].id, action: 'status_changed', summary: `${bookings[6].code} → completed`, created_at: ts(-3, '13:00') },
  ]

  return {
    profiles, team_members: team, services, clients, enquiries, enquiry_followups, projects, project_financials,
    project_team_members, project_tasks, bookings, booking_crew, portfolio_items, testimonials, content_calendar,
    invoices, invoice_items, payments, expenses, notifications, activity_logs, studio_settings: [settings],
    _seq: { enquiries: ec, projects: projects.length, bookings: bc },
  }
}
