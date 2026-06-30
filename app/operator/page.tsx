import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import OperatorDashboard from './OperatorDashboard'

export default async function OperatorPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/operator/login')
  return <OperatorDashboard />
}
