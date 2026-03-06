// app/page.tsx — Root redirect sang dashboard
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/dashboard')
}
