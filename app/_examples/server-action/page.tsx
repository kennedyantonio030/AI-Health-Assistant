// TODO: Duplicate or move this file outside the `_examples` folder to make it a route

import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function ServerAction() {
  const addTodo = async (formData: FormData) => {
    'use server'
    const title = formData.get('title')

    if (title) {
      // Create a Supabase client configured to use cookies
      const supabase = createServerActionClient({ cookies })
      await supabase.from('todos').insert({ title })
      revalidatePath('/server-action-example')
    }
  }

  return (
    <form action={addTodo}>
      <input name="title" />
    </form>
  )
}
