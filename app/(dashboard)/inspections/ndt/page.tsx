import InspectionModuleTable from '@/components/InspectionModuleTable'
import { requireDashboardAuth } from '@/lib/dashboard-auth'

export const dynamic = 'force-dynamic'

export default async function NDTPage() {
    const { cookieStore } = await requireDashboardAuth(['admin', 'dcc', 'qc', 'inspector'])
    const projectId = cookieStore.get('weld-control-project-id')?.value || null

    return <InspectionModuleTable module="ndt" initialProjectId={projectId} />
}
