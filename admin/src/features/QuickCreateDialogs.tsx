import { useNavigate } from 'react-router-dom'
import { useQuickCreate } from '@/components/layout/QuickCreate'
import { EnquiryForm } from './enquiries/EnquiryForm'
import { ProjectForm } from './projects/ProjectForm'
import { BookingForm } from './bookings/BookingForm'
import { ClientForm } from './clients/ClientForm'
import { ExpenseForm } from './finance/ExpenseForm'

/** The global "+" menu and "Create Project" button open these from any page. */
export function QuickCreateDialogs() {
  const { open, setOpen } = useQuickCreate()
  const nav = useNavigate()
  const close = () => setOpen(null)
  return (
    <>
      <EnquiryForm open={open === 'enquiry'} onClose={close} onSaved={(e) => nav(`/enquiries?open=${e.id}`)} />
      <ProjectForm open={open === 'project'} onClose={close} onSaved={(p) => nav(`/projects/${p.id}`)} />
      <BookingForm open={open === 'booking'} onClose={close} />
      <ClientForm open={open === 'client'} onClose={close} onSaved={(c) => nav(`/clients/${c.id}`)} />
      <ExpenseForm open={open === 'expense'} onClose={close} />
    </>
  )
}
