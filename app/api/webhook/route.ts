import { NextRequest, NextResponse } from 'next/server';

// --- Environment Variables Check ---
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN; 

if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID || !WHATSAPP_VERIFY_TOKEN) {
    console.error("CRITICAL ERROR: Missing one or more required environment variables.");
    // In a real production app, you might crash the process here, but for Vercel, logging is sufficient.
}

// --- 1. WhatsApp Message Sending Function ---
/**
 * Sends a text message reply using the WhatsApp Cloud API.
 * This is called asynchronously after receiving the incoming message.
 * @param to - The recipient's phone number (from the incoming message 'from' field).
 * @param messageBody - The text content of the reply.
 */
async function sendWhatsAppMessage(to: string, messageBody: string) {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!accessToken || !phoneNumberId) {
        console.error("❌ CRITICAL: Missing required environment variables.");
        return;
    }
    
    // Log the variables being used (ensure the tokens are present, NOT 'undefined')
    console.log(`Debug: Attempting to send message to ${to}`);
    // DO NOT LOG THE FULL TOKEN! Only a slice.
    console.log(`Debug: Using Phone ID: ${phoneNumberId}, Token Start: ${accessToken.substring(0, 5)}...`);

    // Always use the latest API version (v24.0 as of now)
    const apiUrl = `https://graph.facebook.com/v24.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const payload = {
        messaging_product: 'whatsapp',
        to: to, // The user's number
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
                'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(payload),
        });

        // Parse response to check for success or specific Meta errors
        const responseData = await response.json(); 
        
        if (response.ok) {
            console.log('✅ Message sent successfully:', responseData);
        } else {
            // Log the detailed error from Meta (Crucial for debugging token or payload issues)
            console.error('❌ Failed to send message:', responseData); 
        }
    } catch (error) {
        // Log network or fetch errors
        console.error('⚠️ Error sending message (Network/Fetch failure):', error);
    }
}


// --- 2. Webhook Verification Handler (GET) ---
// This is the function that already worked for verification.
export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN && challenge) {
        console.log('Webhook Verified Successfully!');
        return new Response(challenge, { status: 200 });
    } else {
        return new Response('Verification failed', { status: 403 });
    }
}


// --- 3. Incoming Message Handler (POST) ---
export async function POST(request: NextRequest) {
    // CRITICAL STEP 1: Parse the body immediately
    const body = await request.json();

    // CRITICAL STEP 2: Initiate asynchronous processing and return 200 OK immediately.
    // This prevents Meta from timing out and retrying the webhook.
    (async () => {
        try {
            // Safely navigate the nested webhook payload structure
            const entry = body.entry?.[0];
            const change = entry?.changes?.[0];
            const value = change?.value;
            const incomingMessage = value?.messages?.[0];

            // Only proceed if it is a valid incoming text message
            if (value?.messaging_product === 'whatsapp' && incomingMessage?.type === 'text') {
                
                const senderId = incomingMessage.from; // User's WhatsApp ID/number
                const messageText = incomingMessage.text.body; // User's message content
                
                console.log(`\n\n🟢 NEW MESSAGE RECEIVED`);
                console.log(`From: ${senderId}`);
                console.log(`Text: ${messageText}`);

                // --- AI / Reply Logic Placeholder ---
                // Replace this line with your eventual Antigravity/News API logic
                const simpleReply = `Hello! I received your request for news: "${messageText}". I'm working on getting you the latest updates now!`;

                // Send the reply back to the user
                await sendWhatsAppMessage(senderId, simpleReply);
            }
        } catch (e) {
            // Catches errors during body parsing or nested property access
            console.error('Error processing incoming webhook payload:', e);
        }
    })(); // End of IIFE (asynchronous block)

    // CRITICAL STEP 3: Return 200 OK immediately, regardless of the message content or processing result
    return new Response('EVENT_RECEIVED', { status: 200 });
}