// Vercel Function: GET method for Webhook Verification

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  // CRUCIAL: Replace 'YOUR_VERIFY_TOKEN' with the actual token you set in Meta App Dashboard
  const VERIFY_TOKEN = process.env.WHATSAPP_TOKEN; 

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook Verified Successfully!');
    // Echo the challenge back to Meta
    return new Response(challenge, { status: 200 });
  } else {
    // If the token or mode is incorrect, reject the request
    return new Response('Verification failed', { status: 403 });
  }
}

// Vercel Function: POST method for Incoming Messages

import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  const body = await request.json();

  console.log('Received Webhook Body:', JSON.stringify(body, null, 2));

  if (
    body.object === 'whatsapp_business_account' &&
    body.entry?.[0]?.changes?.[0]?.value?.messages
  ) {
    const messageValue = body.entry[0].changes[0].value;
    const incomingMessage = messageValue.messages[0];

    if (incomingMessage) {
      const senderId = incomingMessage.from;
      const messageType = incomingMessage.type;
      
      if (messageType === 'text') {
        const messageText = incomingMessage.text.body;
        const timestamp = new Date().toISOString();

        console.log(`\n\n🟢 NEW MESSAGE RECEIVED`);
        console.log(`From: ${senderId}`);
        console.log(`Text: ${messageText}`);

        // Write to file
        const logEntry = {
          timestamp,
          senderId,
          messageType,
          messageText,
          fullMessage: incomingMessage
        };

        try {
          const logFile = path.join(process.cwd(), 'messages.jsonl');
          await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
          console.log('Message logged to file');
        } catch (error) {
          console.error('Error writing to file:', error);
        }
      }
    }
  }

  return new Response('EVENT_RECEIVED', { status: 200 });
}