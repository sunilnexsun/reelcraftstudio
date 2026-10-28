import {
  ChartColumn, Briefcase, CalendarDays, Clapperboard, FolderKanban, House, LayoutGrid, MessageSquareQuote, MessagesSquare,
  ReceiptIndianRupee, Settings, UserRound, UsersRound,
} from 'lucide-react'
import type { Module } from '@/lib/permissions'

export interface NavItem { to: string; label: string; icon: typeof House; module: Module; badge?: 'enquiries' | 'bookings' }

export const NAV: NavItem[] = [
  { to: '/', label: 'Overview', icon: House, module: 'overview' },
  { to: '/enquiries', label: 'Enquiries', icon: MessagesSquare, module: 'enquiries', badge: 'enquiries' },
  { to: '/projects', label: 'Projects', icon: Briefcase, module: 'projects' },
  { to: '/portfolio', label: 'Portfolio', icon: Clapperboard, module: 'portfolio' },
  { to: '/services', label: 'Services', icon: LayoutGrid, module: 'services' },
  { to: '/bookings', label: 'Bookings', icon: CalendarDays, module: 'bookings', badge: 'bookings' },
  { to: '/clients', label: 'Clients', icon: UsersRound, module: 'clients' },
  { to: '/testimonials', label: 'Testimonials', icon: MessageSquareQuote, module: 'testimonials' },
  { to: '/team', label: 'Team', icon: UserRound, module: 'team' },
  { to: '/content', label: 'Content Calendar', icon: FolderKanban, module: 'content' },
  { to: '/finance', label: 'Invoices & Expenses', icon: ReceiptIndianRupee, module: 'finance' },
  { to: '/reports', label: 'Reports', icon: ChartColumn, module: 'reports' },
  { to: '/settings', label: 'Settings', icon: Settings, module: 'settings' },
]
