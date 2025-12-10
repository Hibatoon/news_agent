import { promises as fs } from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';

// Vercel Function: GET method for Webhook Verification

export async function GET(request: Request) {
    const url = new URL(request.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    const VERIFY_TOKEN = process.env.WHATSAPP_TOKEN;

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('Webhook Verified Successfully!');
        return new Response(challenge, { status: 200 });
    }

    return new Response('Verification failed', { status: 403 });
}

// Vercel Function: POST method for Incoming Messages

async function logMessageToFile(entry: Record<string, unknown>) {
    // Writes JSONL entries to a local file (non-persistent on Vercel).
    const logPath = path.join(process.cwd(), 'app', 'api', 'webhook', 'logFile');
    await fs.appendFile(logPath, `${JSON.stringify(entry)}\n`, 'utf-8');
}

async function sendWhatsAppMessage(to: string, messageBody: string) {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
        console.error("Missing required environment variables for sending message.");
        return;
    }

    const apiUrl = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`; // Use the current API version

    const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
            body: messageBody,
        },
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify(payload),
        });

        const responseData = await response.json();
        if (response.ok) {
            console.log('Message sent successfully:', responseData);
        } else {
            console.error('Failed to send message:', responseData);
        }
    } catch (error) {
        console.error('Error sending message:', error);
    }
}


export async function POST(request: NextRequest) {
    const body = await request.json();

    if (
        body.object === 'whatsapp_business_account' &&
        body.entry?.[0]?.changes?.[0]?.value?.messages
    ) {
        const messageValue = body.entry[0].changes[0].value;
        const incomingMessage = messageValue.messages?.[0];

        if (!incomingMessage) {
            return new Response('No message found', { status: 200 });
        }

        const senderId = incomingMessage.from;
        const messageType = incomingMessage.type;
        const timestamp = new Date().toISOString();

        if (messageType === 'text') {
            const messageText = incomingMessage.text?.body ?? '';

            console.log(`\n\n🟢 NEW MESSAGE RECEIVED`);
            console.log(`From: ${senderId}`);
            console.log(`Text: ${messageText}`);

            // Persist message details to a JSONL log file
            const logEntry = {
                timestamp,
                senderId,
                messageType,
                messageText,
                raw: incomingMessage,
            };

            // try {
            //     await logMessageToFile(logEntry);
            // } catch (error) {
            //     console.error('Error writing message to file:', error);
            // }

            // Fire-and-forget reply so we don't block the webhook response
            void (async () => {
                const simpleReply = `I received your message: "${messageText}". I will get your news for you soon!`;
                await sendWhatsAppMessage(senderId, simpleReply);
            })();
        }
    }

    // Always acknowledge receipt to avoid Meta retries
    return new Response('EVENT_RECEIVED', { status: 200 });
}