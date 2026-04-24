import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Public callback endpoint hit by Lipwa when STK payment is processed.
// No signature is provided by Lipwa, so we treat the checkout_id as the
// trust anchor and only credit a wallet for transactions we created.
export const Route = createFileRoute("/api/public/lipwa-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = await request.json().catch(() => null);
        if (!payload?.checkout_id) {
          return Response.json({ ok: false, error: "Missing checkout_id" }, { status: 400 });
        }

        const checkoutId: string = payload.checkout_id;
        const status: string = payload.status || "";

        // Find the pending transaction we created when initiating the STK push
        const { data: tx, error: txErr } = await supabaseAdmin
          .from("transactions")
          .select("id, wallet_id, amount, status")
          .eq("checkout_id", checkoutId)
          .single();

        if (txErr || !tx) {
          // Acknowledge so Lipwa doesn't retry forever
          return Response.json({ ok: true, note: "Unknown transaction" });
        }

        // Idempotency — already settled
        if (tx.status === "successful" || tx.status === "failed") {
          return Response.json({ ok: true, note: "Already processed" });
        }

        if (status === "payment.success") {
          // Credit wallet
          const { data: wallet } = await supabaseAdmin
            .from("wallets")
            .select("balance")
            .eq("id", tx.wallet_id)
            .single();

          const currentBalance = Number(wallet?.balance || 0);
          const newBalance = +(currentBalance + Number(tx.amount)).toFixed(2);

          await supabaseAdmin
            .from("wallets")
            .update({ balance: newBalance })
            .eq("id", tx.wallet_id);

          await supabaseAdmin
            .from("transactions")
            .update({
              status: "successful",
              description: `M-PESA Deposit (${payload.mpesa_code || "completed"})`,
              metadata: {
                phone: payload.phone_number,
                mpesa_code: payload.mpesa_code,
                transaction_id: payload.transaction_id,
                payment_date: payload.payment_date,
              },
            })
            .eq("id", tx.id);

          return Response.json({ ok: true });
        }

        if (status === "payment.failed") {
          await supabaseAdmin
            .from("transactions")
            .update({
              status: "failed",
              description: `M-PESA Deposit failed`,
              metadata: { phone: payload.phone_number, payment_date: payload.payment_date },
            })
            .eq("id", tx.id);

          return Response.json({ ok: true });
        }

        // payment.queued or other — leave as pending
        return Response.json({ ok: true });
      },
    },
  },
});
