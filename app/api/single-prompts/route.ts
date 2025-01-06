import { sendWhatsAppMessage } from '@/app/whatsapp-server';
import { anonymiseUser, buildIntrospectionPrompt, generalMediarAIInstructions, generateGoalPrompt } from '@/lib/utils';
import { Database } from '@/types_db';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { llm } from '@/utils/llm';
import TelegramBot from 'node-telegram-bot-api';
import { getHealthData } from '@/lib/get-data';

// export const runtime = 'edge'
export const maxDuration = 300


export async function POST(req: Request) {
  const { userId, timezone, fullName, telegramChatId, phone, goal, language } = await req.json()
  try {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    )

    if (!userId || !timezone || !telegramChatId) {
      console.log("Missing userId, timezone, fullName, or telegramChatId:", userId, timezone, fullName, telegramChatId);
      return NextResponse.json({ message: "Missing userId, timezone, fullName, or telegramChatId" }, { status: 200 });
    }

    console.log("Got user:", userId, timezone, fullName, telegramChatId);

    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN!, { polling: false });

    const user = {
      id: userId,
      timezone,
      full_name: fullName,
      telegram_chat_id: telegramChatId,
      goal: goal || '',
      language: language || 'English',
    }
    console.log("Processing user:", user);

    const usersToday = new Date().toLocaleString('en-US', { timeZone: user.timezone })
    const threeDaysAgo = new Date(new Date().setDate(new Date().getDate() - 3)).toLocaleString('en-US', { timeZone: user.timezone });

    // const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toLocaleString('en-US', { timeZone: user.timezone })
    console.log("Yesterday's date for user:", threeDaysAgo);
    // const yesterdayFromOneAm = new Date(new Date(yesterday).setHours(1, 0, 0, 0)).toLocaleString('en-US', { timeZone: user.timezone })
    const threeDaysAgoFromOneAm = new Date(new Date(threeDaysAgo).setHours(1, 0, 0, 0)).toLocaleString('en-US', { timeZone: user.timezone });

    // Get the current time in the user's timezone
    const currentTime = new Date().toLocaleString('en-US', { timeZone: user.timezone });

    // Get the time eight hours ago in the user's timezone
    const threeHoursAgo = new Date(new Date().setHours(new Date().getHours() - 8)).toLocaleString('en-US', { timeZone: user.timezone });

    // Check if there is already a prompt sent in the last 3 hours
    const { data: recentPrompts } = await supabase
      .from("prompts")
      .select()
      .eq("user_id", user.id)
      .eq('type', 'dynamic')
      .gte('created_at', threeHoursAgo)

    // If a prompt has been sent in the last 3 hours, skip to the next user
    if (recentPrompts && recentPrompts.length > 0) {
      console.log("Prompt already sent in the last 3 hours for user:", user);
      return NextResponse.json({ message: "Prompt already sent in the last 3 hours" }, { status: 200 });
    }

    // Check if the current time is during the day (e.g., between 7 AM and 7 PM)
    const currentHour = new Date(currentTime).getHours();
    if (currentHour < 7 || currentHour > 19) {
      console.log("It's not daytime for user:", user);
      return NextResponse.json({ message: "It's not daytime" }, { status: 200 });
    }

    const healthData = await getHealthData(user, threeDaysAgoFromOneAm);

    if (!healthData) return new Response(``, { status: 200 });

    const anonymisousUser = await anonymiseUser(user);
    const intro = await llm(buildIntrospectionPrompt(`Data since ${threeDaysAgoFromOneAm}:
${healthData}`, anonymisousUser));

    console.log("Generated intro:", intro);

    if (!intro) {
      console.error("No intro generated for user:", user);
      return NextResponse.json({ message: "No intro generated" }, { status: 200 });
    }

    // return NextResponse.json({ message: "Success" }, { status: 200 });

    const { data: d2, error: e2 } = await supabase.from('chats').insert({
      text: intro,
      user_id: user.id,
    });
    console.log("Inserted chat:", d2, "with error:", e2);

    // const hasWhatsapp = await getFeatureFlag(user.id);
    if (phone) {
      console.log("Sending whatsapp message to user:", user);
      // 1. check when was the last whatsapp message with this user

      const { data: lastWhatsappMessage, error: e4 } = await supabase
        .from('chats')
        .select()
        .eq('user_id', user.id)
        .eq('channel', 'whatsapp')
        .gte('created_at', usersToday)
        .order('created_at', { ascending: false })
        .limit(1)

      if (e4) {
        console.log("Error fetching last whatsapp message:", e4.message);
      } else {
        console.log("Last whatsapp message:", lastWhatsappMessage);

        // 2. if it was less than 24 hours ago, skip

        // 3. if it was more than 24 hours ago, send the template message
        // const lastMessage = lastWhatsappMessage[0];
        // const lastMessageDate = lastMessage?.created_at ? new Date(lastMessage.created_at!).getTime() : 0;
        // const now = new Date().getTime();
        // const diff = now - lastMessageDate;
        // const hours = Math.floor(diff / 1000 / 60 / 60);
        // console.log("Last whatsapp message was:", hours, "hours ago");
        // if (!lastWhatsappMessage || lastWhatsappMessage.length === 0 || hours > 24) {

        //   // const template = `👋  Hey! Your health matter a lot to me 🥦💪🧠. How can I become a better health assistant for you?`
        //   const template = `👋 Hey! Your health matter a lot to me 🥦💪🧠. How can I become a better health assistant for you?`
        //   await sendWhatsAppMessage(phone, template);
        // }

        // 4. send the question
        await sendWhatsAppMessage(phone, intro);
      }

    }
    const response = await bot.sendMessage(
      user.telegram_chat_id!,
      intro,
      { parse_mode: 'Markdown' }
    )
    console.log("Message sent to:", user.telegram_chat_id, "with response:", response);

    const { error: e3 } = await supabase.from('prompts').insert({
      text: intro,
      user_id: user.id,
      type: 'dynamic',
    });

    console.log("Inserted question:", intro, "with error:", e3);

    return NextResponse.json({ message: "Success" }, { status: 200 });
  } catch (error) {
    console.log("Error:", error, userId, timezone, fullName, telegramChatId);
    return NextResponse.json({ message: "Error" }, { status: 200 });
  }
}


