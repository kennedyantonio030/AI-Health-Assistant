// TODO: Duplicate or move this file outside the `_examples` folder to make it a route

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function ServerComponent() {
  // Create a Supabase client configured to use cookies
  const supabase = createServerComponentClient({ cookies })

  const { data: todos } = await supabase.from('todos').select()

  return <pre>{JSON.stringify(todos, null, 2)}</pre>
}
