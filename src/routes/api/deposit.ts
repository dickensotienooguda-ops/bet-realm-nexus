import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return "254" + digits.slice(1);
  if ((digits.startsWith("7") || digits.startsWith("1")) && digits.length === 9) return "254" + digits;
  return null;
}

export const Route = createFileRoute("/api/deposit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LIPWA_API_KEY;
        const channelId = process.env.LIPWA_CHANNEL_ID;
        const supabaseUrl = process.env.SUPABASE_URL;
        const anonKey = process.env.SUPABASE_PUBLISHABLE_KEY;

        if (!apiKey || !channelId) {
          return Response.json({ error: "Payment provider not configured" }, { status: 500 });
        }
        if (!supabaseUrl || !anonKey) {
          return Response.json({ error: "Server misconfigured" }, { status: 500 });
        }

        // Identify user from bearer token
        const authHeader = request.headers.get("authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return Response.json({ error: "Not authenticated" }, { status: 401 });
        }
        const token = authHeader.slice(7);
        const userClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: userErr } = await userClient.auth.getUser(token);
        if (userErr || !userData?.user) {
          return Response.json({ error: "Invalid session" }, { status: 401 });
        }
        const userId = userData.user.id;

        const body = await request.json().catch(() => null);
        const amount = Number(body?.amount);
        const phoneRaw = String(body?.phone_number || "");
        if (!amount || amount < 150 || amount > 250000) {
          return Response.json({ error: "Amount must be between 150 and 250,000" }, { status: 400 });
        }
        const phone = normalizePhone(phoneRaw);
        if (!phone) {
          return Response.json({ error: "Invalid phone number" }, { status: 400 });
        }

        // Find user wallet
        const { data: wallet, error: wErr } = await supabaseAdmin
          .from("wallets")
          .select("id")
          .eq("user_id", userId)
          .single();
        if (wErr || !wallet) {
          return Response.json({ error: "Wallet not found" }, { status: 404 });
        }

        // Build callback URL from request origin
        const origin = new URL(request.url).origin;
        const callbackUrl = `${origin}/api/public/lipwa-callback`;

        // Initiate STK push
        const lipwaRes = await fetch("https://pay.lipwa.app/api/payments", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone_number: phone,
            amount: Math.floor(amount),
            channel_id: channelId,
            callback_url: callbackUrl,
            api_ref: { user_id: userId, wallet_id: wallet.id },
          }),
        });

        const lipwaData = await lipwaRes.json().catch(() => ({}));
        if (!lipwaRes.ok || lipwaData.ResponseCode !== "0") {
          return Response.json(
            { error: lipwaData?.errorMessage || lipwaData?.ResponseDescription || "Failed to initiate payment" },
            { status: 400 }
          );
        }

        const checkoutId: string = lipwaData.CheckoutRequestID;

        // Create pending transaction
        await supabaseAdmin.from("transactions").insert({
          wallet_id: wallet.id,
          type: "deposit",
          amount: amount,
          status: "pending",
          description: `M-PESA STK Push to ${phone}`,
          reference: checkoutId,
          checkout_id: checkoutId,
          metadata: { phone, merchant_request_id: lipwaData.MerchantRequestID },
        });

        return Response.json({
          success: true,
          checkout_id: checkoutId,
          message: lipwaData.CustomerMessage || "Check your phone to complete payment",
        });
      },
    },
  },
});
