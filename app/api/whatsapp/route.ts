import { Message, sendWhatsAppMessage } from "@/app/whatsapp-server";
import { Database } from "@/types_db";
import { createClient } from "@supabase/supabase-js";
import { kv } from '@vercel/kv';
import fetch from 'node-fetch';
import { HfInference } from "@huggingface/inference";
import { anonymiseUser, baseMediarAI, buildQuestionPrompt, generalMediarAIInstructions, isTagOrQuestion } from "@/lib/utils";
import { llm, llmPrivate } from "@/utils/llm";
import { getCaption, opticalCharacterRecognition } from "@/lib/google-cloud";
import { getHealthData } from "@/lib/get-data";
import { getDefaultMessage } from "@/lib/messages";


export const maxDuration = 300

async function getOriginalMessage(messages: Message[], answer: string): Promise<string> {
  const prompt = `

Human: 
Your task is to determine the original question or statement that this answer is responding to.
The conversation happens in WhatsApp BTW.
What was the original question or statement that this answer is responding to?

<answer>${answer}</answer>

<messages>${messages.map((message) => message.body).join('\n')}</messages>

Only answer the index of the message that you think is the original question or statement.

e.g. 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ...

Assistant:`;
  const originalMessage = await llm(prompt, 3, 'claude-instant-1.2', 10);

  return messages[parseInt(originalMessage.trim()) - 1].body;
}



// Define the type for the incoming request
interface IncomingRequest {
  SmsMessageSid: string;
  NumMedia: number;
  ProfileName: string;
  SmsSid: string;
  WaId: string;
  SmsStatus: string;
  Body: string;
  To: string;
  NumSegments: number;
  ReferralNumMedia: number;
  MessageSid: string;
  AccountSid: string;
  From: string;
  ApiVersion: string;
}




const track = async (userId: string) => {
  await fetch(
    'https://app.posthog.com/capture/',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: 'phc_V7co1flWmfnd9Hd6LSyPRau9sARsxMEiOrmNvGeUhbJ',
        event: 'whatsapp message received',
        distinct_id: userId,
      }),
    }
  )
}
const QUESTION_PREFIX = 'question_';
const TAG_PREFIX = 'tag_';

export async function POST(req: Request) {
  const body = await req.text();
  const params = new URLSearchParams(body);
  const parsed = Object.fromEntries(params) as any;
  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!
  )
  try {
    console.log(parsed);
    const phoneNumber = parsed.From.replace('whatsapp:', '')
    const { data, error } = await supabase.from('users').select().eq('phone', phoneNumber).limit(1);
    if (error || !data || data.length === 0) {
      console.log(error, data)
      return new Response(`Error fetching user or user not found. Error: ${error?.message}`, { status: 400 });

    }
    const user = data[0];

    const phoneVerified = data[0].phone_verified || false
    await track(user.id)
    if (!phoneVerified) {
      return new Response(`Your phone has not been verified!`);
    }

    const date = new Date().toLocaleDateString('en-US', { timeZone: data[0].timezone });
    const questionKey = QUESTION_PREFIX + user.id + '_' + date;
    const tagKey = TAG_PREFIX + user.id + '_' + date;

    console.log("Question key:", questionKey, "Tag key:", tagKey);
    const questionCount = (await kv.get(questionKey)) as number || 0;
    const tagCount = (await kv.get(tagKey)) as number || 0;
    console.log("Question count:", questionCount, "Tag count:", tagCount);

    const hasImage = parsed.NumMedia > 0;
    if (hasImage) {
      // Check if the user has more than two tags or questions and is not on the standard plan
      if (tagCount > 2 && user.plan !== 'standard') {
        const upgradeMessage = "You have reached the limit for your current plan. Please upgrade to the standard plan to continue using our service. https://buy.stripe.com/28oeVDdGu4RA2JOfZ2";
        await sendWhatsAppMessage(phoneNumber, upgradeMessage);
        return new Response('');
      }
      const msg = "Sure, give me a few seconds to understand your image 🙏."
      await sendWhatsAppMessage(phoneNumber, msg)

      await kv.incr(tagKey);
      console.log("Image received, sending to inference API");

      const urlContentToDataUri = async (url: string) => {
        const response = await fetch(url);
        const buffer = await response.buffer();
        const base64 = buffer.toString('base64');
        return base64;
      };
      await supabase.from('chats').insert({
        text: JSON.stringify(parsed.MediaUrl0),
        user_id: user.id,
        category: 'tag',
        channel: 'whatsapp'
      });
      const b64Image = await urlContentToDataUri(parsed.MediaUrl0);
      const [elementsCaption, actionCaption, textCaption]: string[] = await Promise.all([
        getCaption('list each element in the image', b64Image),
        getCaption('what is the person doing?', b64Image),
        opticalCharacterRecognition(b64Image)
      ]);
      let captions = []

      // if detected caption is not "unanswerable", add it to the caption
      // `elements: ${elementsCaption}, action: ${actionCaption}, text: ${textCaption}`;
      if (elementsCaption !== 'unanswerable') {
        captions.push('elements: ' + elementsCaption)
      }
      if (actionCaption !== 'unanswerable') {
        captions.push('action: ' + actionCaption)
      }
      if (textCaption.length > 3) {
        const escapeMarkdown = (text: string) => {
          const specialChars = ['*', '_', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
          return text.split('').map(char => specialChars.includes(char) ? '\\' + char : char).join('');
        }
        const sanitizedText = escapeMarkdown(textCaption);
        captions.push('text: ' + sanitizedText)
      }
      //     const llmAugmented = await llm(`Human:
      // Based on these captions created by an AI from a image message sent by a user for a health app,
      // what is the most likely tag for this image? Is it food? Is it a workout? Is it a sleep event? Is it a selfie?
      // How many calories do you think this meal has? Try to augment these captions generated by VQA model.
      // Your task is to generate a tag that is most likely to be associated with this image related to what the person
      // is doing, feeling, consuming, etc. Generate a concise tag that still encapsulates the most important information.
      // This tag will be associated with the user's health data from wearables like Oura, Neurosity, Apple Watch, etc.
      // Here are how the captions were generated:

      // const b64Image = await urlContentToDataUri(parsed.MediaUrl0);
      // const [elementsCaption, actionCaption, textCaption]: string[] = await Promise.all([
      //   getCaption('list each element in the image', b64Image), // this usually returns things like food, person, table, object, etc
      //   getCaption('what is the person doing?', b64Image), // this usually returns things like eating, running, sleeping, etc
      //   opticalCharacterRecognition(b64Image) // this usually returns text in the image
      // ]);
      // let captions = []

      // // if detected caption is not "unanswerable", add it to the caption
      // if (elementsCaption !== 'unanswerable') {
      //   captions.push('elements: ' + elementsCaption)
      // }
      // if (actionCaption !== 'unanswerable') {
      //   captions.push('action: ' + actionCaption)
      // }
      // if (textCaption.length > 3) {
      //   captions.push('text: ' + textCaption)
      // }

      // Captions:${JSON.stringify([elementsCaption, actionCaption, textCaption])}

      //     Assistant:`, 3, 'claude-instant-1.2', 100)
      //     captions.push('agi: ' + llmAugmented)

      console.log("Captions:", captions);
      const caption = captions.join('\n')
      // const caption = llmAugmented
      // list each element in the image
      // what is the person doing?
      console.log("Caption:", caption);

      // Insert as tag
      const { data: d2, error: e2 } = await supabase.from('tags').insert({
        text: caption,
        user_id: user.id
      });

      console.log("Tag added:", d2, e2);


      return new Response(getDefaultMessage('imageTagMessage',
        user.language || 'English',
        { caption }));
    }
    console.log(`Message from ${parsed.ProfileName}: ${parsed.Body}`);

    const intent = await isTagOrQuestion(parsed.Body);
    if (intent === 'question') {
      // Check if the user has more than two tags or questions and is not on the standard plan
      if (questionCount > 2 && user.plan !== 'standard') {
        // Send a message to the user asking them to upgrade their plan
        const upgradeMessage = "You have reached the limit for your current plan. Please upgrade to the standard plan to continue using our service. https://buy.stripe.com/28oeVDdGu4RA2JOfZ2";
        await sendWhatsAppMessage(phoneNumber, upgradeMessage);
        return new Response('');
      }
      await kv.incr(questionKey);
      const msg = "Sure, give me a few seconds to read your data and I'll get back to you with an answer in less than a minute 🙏. PS: Any feedback appreciated ❤️"
      await sendWhatsAppMessage(phoneNumber, msg)
      const supabase = createClient<Database>(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_KEY!
      )

      // 2. Compute yesterday's date for the user

      const threeDaysAgo = new Date(new Date().setDate(new Date().getDate() - 3)).toLocaleString('en-US', { timeZone: user.timezone });

      console.log("Yesterday's date for user:", threeDaysAgo);
      const threeDaysAgoFromOneAm = new Date(new Date(threeDaysAgo).setHours(1, 0, 0, 0)).toLocaleString('en-US', { timeZone: user.timezone });

      const healthData = await getHealthData(user, threeDaysAgoFromOneAm)

      if (!healthData) return new Response(``, { status: 200 });
      const anonymisousUser = await anonymiseUser(user);

      const response = await llm(buildQuestionPrompt(
        `Data since ${threeDaysAgoFromOneAm}:
${healthData}`,
        anonymisousUser,
        parsed.Body
      ));

      console.log("Response:", response);
      const { data, error } = await supabase.from('chats').insert({
        text: response,
        user_id: user.id,
        category: 'answer',
      });


      console.log("Chat added:", data, error);
      await sendWhatsAppMessage(phoneNumber, response)
      return new Response('');
    } else if (intent === 'tag' || intent === 'answer') {
      await kv.incr(tagKey);
      let tag = parsed.Body;
      // if the intent is answer, we want to add the original question to the tag as well
      if (intent === 'answer') {
        // get the last prompt

        const { data: lastPrompt, error: e4 } = await supabase
          .from('prompts')
          .select()
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)

        if (e4 || !lastPrompt || lastPrompt.length === 0) {
          console.log("Error fetching last prompt:", e4?.message);
        } else {
          const originalMessage = lastPrompt![0].text;

          tag = originalMessage + '\n' + tag;
        }
      } else {
        // Check if the user has more than two tags or questions and is not on the standard plan
        if (tagCount > 2 && user.plan !== 'standard') {
          // Send a message to the user asking them to upgrade their plan
          const upgradeMessage = "You have reached the limit for your current plan. Please upgrade to the standard plan to continue using our service. https://buy.stripe.com/28oeVDdGu4RA2JOfZ2";
          await sendWhatsAppMessage(phoneNumber, upgradeMessage);
          return new Response('');
        }
      }

      const { data, error } = await supabase.from('tags').insert({
        text: tag,
        user_id: user.id,
      });
      console.log("Tag added:", data, error);
      await supabase.from('chats').insert({
        text: tag,
        user_id: user.id,
        category: intent,
        channel: 'whatsapp'
      });


      return new Response(getDefaultMessage('tagMessage', user.language || 'English'));
    } else if (intent === 'feedback') {
      // New code for feedback intent
      const { data, error } = await supabase.from('chats').insert({
        text: parsed.Body,
        user_id: user.id,
        category: 'feedback',
        channel: 'whatsapp'
      });
      console.log("Feedback added:", data, error);

      return new Response(getDefaultMessage('feedbackMessage', user.language || 'English'));
    }
    return new Response(getDefaultMessage('defaultUnclassifiedMessage', user.language || 'English'));
  } catch (error) {
    console.log(error);
    return new Response(
      'Webhook handler failed. View your nextjs function logs.',
      { status: 200 });
  }
}

