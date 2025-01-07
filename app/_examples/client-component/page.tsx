'use client'

// TODO: Duplicate or move this file outside the `_examples` folder to make it a route

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'

export default function ClientComponent() {
  const [todos, setTodos] = useState<any[]>([])
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getTodos = async () => {
      const { data } = await supabase.from('todos').select()
      if (data) {
        setTodos(data)
      }
    }

    getTodos()
  }, [supabase, setTodos])

  return <pre>{JSON.stringify(todos, null, 2)}</pre>
}
