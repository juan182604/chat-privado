'use client'

import { useEffect, useState } from 'react'
import { useAppStore, Friend } from '@/lib/store'
import { X, Search, UserPlus, Check, Loader2 } from 'lucide-react'

export function AddContactDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const { user } = useAppStore()
  const [query, setQuery] = useState('')
