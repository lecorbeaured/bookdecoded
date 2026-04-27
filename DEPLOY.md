# BookDecoded — Deployment Instructions

## What's In This Folder

```
bookdecoded-deploy/
├── index.html              → bookdecoded.com homepage
├── trojan/
│   └── index.html          → trojan.bookdecoded.com guide (full monetized)
├── functions/
│   └── contact.js          → Netlify serverless function (Resend email)
├── netlify.toml            → Build config, redirects, security headers
├── robots.txt              → Search engine directives
├── sitemap.xml             → Both URLs indexed
└── DEPLOY.md               → This file
```

---

## Step 1 — Netlify Setup

1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site → Deploy manually**
2. Drag the entire `bookdecoded-deploy/` folder into the deploy dropzone
3. Site will deploy to a random `.netlify.app` URL — confirm it loads

---

## Step 2 — Connect Your Domain

1. In Netlify → **Domain management → Add custom domain**
2. Add `bookdecoded.com`
3. In your DNS provider (Namecheap / Cloudflare / GoDaddy), set:

```
Type    Name     Value
A       @        75.2.60.5
CNAME   www      your-site.netlify.app
```

4. Enable **Force HTTPS** in Netlify → SSL/TLS (auto-provisions Let's Encrypt)

---

## Step 3 — Set Up the Subdomain (trojan.bookdecoded.com)

In your DNS provider, add:

```
Type    Name     Value
CNAME   trojan   your-site.netlify.app
```

Then in Netlify → **Domain management → Add domain alias** → type `trojan.bookdecoded.com`

The `netlify.toml` already handles routing — requests to `trojan.bookdecoded.com/*` serve from `/trojan/`.

---

## Step 4 — Resend Email (When Ready)

### 4a. Create Resend Account
1. Go to [resend.com](https://resend.com) → Sign up free
2. Add domain: `bookdecoded.com`
3. Add the DNS records Resend provides (SPF, DKIM, DMARC)

```
Type    Name                Value
TXT     @                   v=spf1 include:amazonses.com ~all
TXT     resend._domainkey   [Resend provides this]
MX      send                feedback-smtp.us-east-1.amazonses.com
```

4. Generate API key → copy it (shown once)

### 4b. Add Environment Variables in Netlify
In Netlify → **Site configuration → Environment variables → Add variable**:

```
RESEND_API_KEY    re_xxxxxxxxxxxxxxxxxxxx   (your Resend API key)
TO_EMAIL          hello@bookdecoded.com     (where contact forms go)
```

### 4c. Enable the Function
In `netlify.toml`, uncomment the functions block:

```toml
[functions]
  directory = "functions"
```

### 4d. Update Form Submissions in HTML
In each HTML file, find the form submit functions and replace the
`setTimeout` simulation with a real fetch call:

```javascript
// Replace this in submitModal(), unlockGate(), capSubmit():
const response = await fetch('/.netlify/functions/contact', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'contact',  // or 'gate' or 'notify'
    name, email, subject, message
  })
});
const result = await response.json();
if (result.success) { /* show success state */ }
```

---

## Step 5 — Payhip Workbook Listing

1. Go to [payhip.com/ericcoste](https://payhip.com/ericcoste)
2. Add product → Digital Download
3. Upload the workbook PDF when built
4. Set price: **$8** (reduces to 8 numerologically)
5. The workbook CTA button already links to `payhip.com/ericcoste` — no code change needed

---

## Step 6 — IndexNow (Search Indexing)

Submit both URLs immediately after deploy using your IndexNow key:

```
https://api.indexnow.org/indexnow?url=https://bookdecoded.com/&key=7a8f6fcf-d0bd-449c-9265-1a485a887e60
https://api.indexnow.org/indexnow?url=https://trojan.bookdecoded.com/&key=7a8f6fcf-d0bd-449c-9265-1a485a887e60
```

Also submit sitemap to Google Search Console:
- Add property: `bookdecoded.com`
- Submit sitemap: `https://bookdecoded.com/sitemap.xml`

---

## Live URLs (after deploy)

| URL | File |
|-----|------|
| bookdecoded.com | /index.html |
| trojan.bookdecoded.com | /trojan/index.html |

---

## What's Still To Build

- [ ] Workbook PDF (30-day printable journal) → upload to Payhip at $8
- [ ] Wire Resend (Step 4 above) — 3 form endpoints: contact, gate, notify
- [ ] The 48 Laws of Power guide → 48laws.bookdecoded.com
- [ ] Influence — Cialdini guide → influence.bookdecoded.com
- [ ] Atomic Habits guide → atomichabits.bookdecoded.com
- [ ] Add og-image.jpg (1200×630) to root for social sharing previews
- [ ] Google Analytics or Plausible for traffic visibility
