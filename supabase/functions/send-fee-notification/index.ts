import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  studentName: string;
  phoneNumber: string;
  amount: number;
  month: string;
  year: number;
  paymentDate: string;
}

const sendSMS = async (to: string, body: string) => {
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: TWILIO_PHONE_NUMBER!,
        Body: body,
      }),
    }
  );

  return response.json();
};

const sendWhatsApp = async (to: string, body: string) => {
  const auth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
  
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: `whatsapp:${to}`,
        From: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
        Body: body,
      }),
    }
  );

  return response.json();
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { studentName, phoneNumber, amount, month, year, paymentDate }: NotificationRequest = await req.json();

    console.log("Sending notifications for:", { studentName, phoneNumber, amount, month, year });

    // Format phone number (ensure it starts with +)
    const formattedPhone = phoneNumber.startsWith("+") ? phoneNumber : `+${phoneNumber}`;

    // Create SMS message
    const smsMessage = `Fee Payment Receipt - Student: ${studentName}, Amount: Rs. ${amount} for ${month} ${year}. Payment Date: ${paymentDate}. Thank you!`;

    // Send SMS notification only
    const smsResult = await sendSMS(formattedPhone, smsMessage);

    console.log("SMS result:", smsResult);

    return new Response(
      JSON.stringify({
        success: true,
        sms: smsResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-fee-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
