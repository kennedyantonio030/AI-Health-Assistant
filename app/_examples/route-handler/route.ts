// TODO: Duplicate or move this file outside the `_examples` folder to make it a route

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // Create a Supabase client configured to use cookies
  const supabase = createRouteHandlerClient({ cookies })
  const { data: todos } = await supabase.from('todos').select()

  return NextResponse.json(todos)
}
