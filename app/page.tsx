'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

function page() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    router.replace('/login')
    setMounted(true)
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-muted-foreground">Loading...</div>
    </div>
  )
}

export default page