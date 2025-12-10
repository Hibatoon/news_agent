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

export async function POST(request: Request) {
  const body = await request.json();

  console.log('Received Webhook Body:', JSON.stringify(body, null, 2));

  // STEP 1: Check the basic structure of the webhook event
  if (
    body.object === 'whatsapp_business_account' &&
    body.entry?.[0]?.changes?.[0]?.value?.messages
  ) {
    const messageValue = body.entry[0].changes[0].value;
    const incomingMessage = messageValue.messages[0];

    if (incomingMessage) {
      // Extract key message details (like the sender ID and the message text)
      const senderId = incomingMessage.from;
      const messageType = incomingMessage.type;
      
      // We are only interested in text messages for now
      if (messageType === 'text') {
        const messageText = incomingMessage.text.body;

        console.log(`\n\n🟢 NEW MESSAGE RECEIVED`);
        console.log(`From: ${senderId}`);
        console.log(`Text: ${messageText}`);

        // ------------------------------------------------------------------
        // STEP 2 (Next Iteration): Process the message logic (AI/News API)
        // Here you would integrate your Antigravity logic:
        // const responseText = await antigravity.processMessage(messageText, senderId);
        // await whatsappAPI.sendTextMessage(senderId, responseText);
        // ------------------------------------------------------------------
      }
    }
  }

  // CRUCIAL: Always send an immediate 200 OK response back to WhatsApp
  // This tells Meta that you received the message and prevents them from retrying.
  return new Response('EVENT_RECEIVED', { status: 200 });
}