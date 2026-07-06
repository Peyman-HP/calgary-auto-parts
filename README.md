# Calgary Auto Parts

Responsive English storefront for a Calgary auto parts and mobile installation business, focused on batteries and tires.

## Run

```bash
npm install
npm start
```

Open `http://localhost:4173`.

## Admin

Open `http://localhost:4173/admin.html`.

Default admin passcode: `2468`

The passcode is stored as a SHA-256 hash after the first login and login issues a session token (valid 12 hours). To change the passcode, use the Settings tab; leave the field blank to keep the current one. If you forget it, edit `adminPasscode` in `data/db.json` to a new plain value and log in once.

Use the admin panel to:
- add, edit, duplicate, delete, and upload product images (with a search box for large catalogs)
- define product type, category, brand, model, fitments, price, install fee, and free-install display
- write, duplicate, and manage SEO articles
- track orders: set status (new / contacted / done) and delete old orders
- set delivery price per kilometre
- set the owner email and SMTP settings for new order emails
- choose how new orders are announced: email, Telegram, or both, and set the Telegram bot token/chat ID

## Homepage curation

- **Newest first** — products and articles are sorted newest-first on the storefront; items marked "Pin to homepage" always appear before everything else.
- **Star rating** — set a 0-5 star rating per product in the admin product form; stars show on product cards and the slider.
- **Slider** — in Settings > Homepage slider, pick one product and/or one article to feature in the rotating slider at the top of the homepage.

## Deploy to the internet

The app is a single Node process with a JSON file database (`data/db.json`), so it needs a host with a **persistent disk** and a **single instance**.

**Option A - Render.com (easiest):** push this folder to a GitHub repo, create a new Web Service on Render, and it will read `render.yaml` automatically (Node 20, persistent 1 GB disk mounted at `data/`). Starter plan ~$7/month; HTTPS and a `.onrender.com` subdomain are included, and you can attach your own domain.

**Option B - Any VPS (Hetzner, DigitalOcean, ...):** install Node 20 or Docker (a `Dockerfile` is included), run the app behind Caddy or Nginx for HTTPS, and point your domain at the server. ~$4-6/month.

Before going live:
1. Change the admin passcode to something strong (Settings tab).
2. Set real SMTP credentials if you want email notifications.
3. Keep `TELEGRAM_BOT_TOKEN` in environment variables rather than the admin panel if the host supports it.

## Data safety

- Orders are rate limited to 5 per 10 minutes per connection.
- A dated backup of `data/db.json` is written to `data/backups/` on the first change of each day (the last 14 backups are kept).

## Email

Orders are always saved in `data/db.json`.

If SMTP is configured in the admin panel or `.env`, the app sends a `New order` email to the configured owner address. If SMTP is not configured, the email body is saved to `data/outbox` for testing.

## Telegram

In the admin Settings tab, set "Notify owner via" to Telegram or Email and Telegram, then fill in:

- **Telegram bot token** — create a bot by messaging [@BotFather](https://t.me/BotFather) on Telegram and running `/newbot`.
- **Telegram chat IDs** — each recipient must message the bot once (e.g. `/start`), then open `https://api.telegram.org/bot<token>/getUpdates` in a browser (or message [@userinfobot](https://t.me/userinfobot)) to find their numeric chat ID. Separate multiple chat IDs with commas to notify more than one person.

The order message is sent in both English and Persian.

These can also be set via `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env`, which override the admin panel values.
