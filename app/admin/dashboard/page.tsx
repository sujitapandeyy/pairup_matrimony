'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminDashboard from '@/components/Admin/AdminDashboard'

export default function AdminDash() {
  const router = useRouter()

//   useEffect(() => {
//     const stored = JSON.parse(localStorage.getItem('pairupUser') || '{}')
//     if (!stored || stored.role !== 'admin') {
//       router.push('/login')
//     }
//   }, [])

   return <AdminDashboard />
 
}
