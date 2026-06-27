'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

function page() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/login')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  )
}

export default page