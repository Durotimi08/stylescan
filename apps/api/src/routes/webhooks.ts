import { Hono } from "hono";
import Stripe from "stripe";
import { sql } from "../lib/db";

export const webhookRoutes = new Hono();

// POST /webhooks/stripe — Stripe webhook handler
webhookRoutes.post("/stripe", async (c) => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return c.json({ error: "Stripe not configured" }, 503);
  }
  const stripe = new Stripe(key);

  const sig = c.req.header("stripe-signature");
  const rawBody = await c.req.text();

  if (!sig) {
    return c.json({ error: "Missing Stripe signature" }, 400);
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? ""
    );
  } catch (err) {
    console.error("Stripe webhook verification failed:", err);
    return c.json({ error: "Invalid signature" }, 400);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const plan = session.metadata?.plan;

      if (userId && plan) {
        await sql`
          UPDATE users SET plan = ${plan} WHERE id = ${userId}
        `;
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;

      if (userId) {
        const status = subscription.status;
        if (status === "active") {
          const plan = subscription.metadata?.plan ?? "pro";
          await sql`
            UPDATE users SET plan = ${plan} WHERE id = ${userId}
          `;
        }
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.user_id;

      if (userId) {
        await sql`
          UPDATE users SET plan = 'free' WHERE id = ${userId}
        `;
      }
      break;
    }

    default:
      console.log(`Unhandled Stripe event: ${event.type}`);
  }

  return c.json({ received: true });
});

// POST /webhooks/clerk — Clerk webhook handler
webhookRoutes.post("/clerk", async (c) => {
  const body = await c.req.json();
  const eventType = body.type;

  switch (eventType) {
    case "user.created": {
      const { id, email_addresses } = body.data;
      const email = email_addresses?.[0]?.email_address;

      if (email) {
        await sql`
          INSERT INTO users (email, clerk_user_id, plan)
          VALUES (${email}, ${id}, 'free')
          ON CONFLICT (clerk_user_id) DO NOTHING
        `;
      }
      break;
    }

    case "user.deleted": {
      const { id } = body.data;
      await sql`
        DELETE FROM users WHERE clerk_user_id = ${id}
      `;
      break;
    }

    default:
      console.log(`Unhandled Clerk event: ${eventType}`);
  }

  return c.json({ received: true });
});
