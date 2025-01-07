import { Database } from '@/types_db';
import { getURL } from '@/utils/helpers';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const customReadable = new ReadableStream({
    async start(controller) {
      const supabase = createClient<Database>(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_KEY!
      )
      const { error, data: users } = await supabase
        .from('users')
        .select('id, timezone, metriport_user_id')
      if (error) {
        controller.enqueue(encoder.encode("Error fetching users: " + error.message));
        controller.close();
        return;
      }

      const usersWithMetriportUserId = users.filter((user: any) => user.metriport_user_id);


      for (const user of usersWithMetriportUserId) {
        try {
          await queueInsightTask(user);
          controller.enqueue(encoder.encode(`Task queued successfully for user: ${JSON.stringify(user)}\n`));
        } catch (error) {
          controller.enqueue(encoder.encode(`Error queuing task for user: ${JSON.stringify(user)} with error: ${error}\n`));
        }
      }

      controller.close();
    },
  });

  return new Response(customReadable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

const queueInsightTask = async (user: any) => {
  const taskData = {
    userId: user.id,
    timezone: user.timezone,
    metriportUserId: user.metriport_user_id
  };
  const baseUrl = getURL().replace(/\/$/, '')
  const url = baseUrl + '/api/single-multiport';
  console.log("Queuing task for user:", user, "at url:", url);


  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-type': 'application/json'
    },
    body: JSON.stringify(taskData)
  });

  const responseData = await response.json();
  if (!response.ok) {
    console.log("Failed to queue task for user:", user, "with response:", responseData);
    throw new Error(responseData.message || "Failed to queue task");
  }

  console.log("Task queued successfully for user:", user, "with response:", responseData);
}