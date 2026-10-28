import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from '@/lib/auth'
import { can, type Module } from '@/lib/permissions'
import { DateRangeProvider } from '@/hooks/useDateRange'
import { ConfirmProvider } from '@/components/ui/confirm'
import { AppLayout } from '@/components/layout/AppLayout'
import { Spinner, EmptyState } from '@/components/ui/states'
import LoginPage from '@/pages/LoginPage'
import { ForgotPasswordPage, NotFoundPage, PendingApprovalPage, UpdatePasswordPage } from '@/pages/AuthPages'
import { ShieldAlert } from 'lucide-react'

const OverviewPage = lazy(() => import('@/features/overview/OverviewPage'))
const EnquiriesPage = lazy(() => import('@/features/enquiries/EnquiriesPage'))
const ProjectsPage = lazy(() => import('@/features/projects/ProjectsPage'))
const ProjectDetailPage = lazy(() => import('@/features/projects/ProjectDetailPage'))
const BookingsPage = lazy(() => import('@/features/bookings/BookingsPage'))
const ClientsPage = lazy(() => import('@/features/clients/ClientsPage'))
const ClientDetailPage = lazy(() => import('@/features/clients/ClientDetailPage'))
const PortfolioPage = lazy(() => import('@/features/portfolio/PortfolioPage'))
const ServicesPage = lazy(() => import('@/features/services/ServicesPage'))
const TeamPage = lazy(() => import('@/features/team/TeamPage'))
const TestimonialsPage = lazy(() => import('@/features/testimonials/TestimonialsPage'))
const ContentPage = lazy(() => import('@/features/content/ContentPage'))
const FinancePage = lazy(() => import('@/features/finance/FinancePage'))
const InvoiceEditorPage = lazy(() => import('@/features/finance/InvoiceEditorPage'))
const InvoiceViewPage = lazy(() => import('@/features/finance/InvoiceViewPage'))
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const PublicSitePage = lazy(() => import('@/features/website/PublicSitePage'))

function FullScreenSpinner() { return <div className="grid min-h-dvh place-items-center"><Spinner className="size-8" /></div> }

function Protected({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const loc = useLocation()
  if (status === 'loading') return <FullScreenSpinner />
  if (status === 'signed_out') return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />
  if (status === 'pending') return <PendingApprovalPage />
  return <>{children}</>
}

function RequireModule({ module, action = 'view', children }: { module: Module; action?: 'view' | 'create' | 'edit'; children: ReactNode }) {
  const { role } = useAuth()
  if (!can(role, module, action)) return <EmptyState icon={<ShieldAlert />} title="You don't have access to this page" description="Ask a studio owner if you need this permission." />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DateRangeProvider>
          <ConfirmProvider>
            <Suspense fallback={<FullScreenSpinner />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/update-password" element={<UpdatePasswordPage />} />
                <Route path="/site" element={<PublicSitePage />} />
                <Route element={<Protected><AppLayout /></Protected>}>
                  <Route index element={<RequireModule module="overview"><OverviewPage /></RequireModule>} />
                  <Route path="enquiries" element={<RequireModule module="enquiries"><EnquiriesPage /></RequireModule>} />
                  <Route path="projects" element={<RequireModule module="projects"><ProjectsPage /></RequireModule>} />
                  <Route path="projects/:id" element={<RequireModule module="projects"><ProjectDetailPage /></RequireModule>} />
                  <Route path="bookings" element={<RequireModule module="bookings"><BookingsPage /></RequireModule>} />
                  <Route path="clients" element={<RequireModule module="clients"><ClientsPage /></RequireModule>} />
                  <Route path="clients/:id" element={<RequireModule module="clients"><ClientDetailPage /></RequireModule>} />
                  <Route path="portfolio" element={<RequireModule module="portfolio"><PortfolioPage /></RequireModule>} />
                  <Route path="services" element={<RequireModule module="services"><ServicesPage /></RequireModule>} />
                  <Route path="team" element={<RequireModule module="team"><TeamPage /></RequireModule>} />
                  <Route path="testimonials" element={<RequireModule module="testimonials"><TestimonialsPage /></RequireModule>} />
                  <Route path="content" element={<RequireModule module="content"><ContentPage /></RequireModule>} />
                  <Route path="finance" element={<RequireModule module="finance"><FinancePage /></RequireModule>} />
                  <Route path="finance/invoices/new" element={<RequireModule module="finance" action="create"><InvoiceEditorPage /></RequireModule>} />
                  <Route path="finance/invoices/:id" element={<RequireModule module="finance"><InvoiceViewPage /></RequireModule>} />
                  <Route path="finance/invoices/:id/edit" element={<RequireModule module="finance" action="edit"><InvoiceEditorPage /></RequireModule>} />
                  <Route path="reports" element={<RequireModule module="reports"><ReportsPage /></RequireModule>} />
                  <Route path="settings" element={<RequireModule module="settings"><SettingsPage /></RequireModule>} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
            <Toaster theme="dark" position="bottom-right" richColors closeButton toastOptions={{ style: { background: '#171717', border: '1px solid rgba(255,255,255,0.12)' } }} />
          </ConfirmProvider>
        </DateRangeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
