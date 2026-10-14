# Launch checklist: Craig Spencer Ceramics

Updated Wednesday 14 October 2026, 11:55 am Pacific. LIVE on craigspencerceramics.com.

Launch moment: noon New Zealand time. The next noon in New Zealand is Wednesday 14 October, which is Tuesday 13 October, 4:00 pm Pacific for Wyatt (10:00 am Tuesday in New South Wales for Craig). Note: noon Tuesday New Zealand time has already passed; it was 4:00 pm Pacific on Monday.

## Before launch (Tuesday morning)

### Wyatt
- [x] **shop@ mailbox.** Up and working in Microsoft 365 (13 Oct).
- [x] **Netlify Forms notification.** Working, confirmed 13 Oct: contact messages reach shop@craigspencerceramics.com. A second notification to Wyatt's gmail is still on as a backup copy; delete it in Netlify, Forms, Submission notifications when no longer wanted. The test submissions in Netlify can be deleted.
- [x] **Terms page commissions clause** removed (13 Oct).
- [x] **Launch-day sweep (13 Oct, midday).** Four agents crawled staging on desktop, phone and by script: 136 URLs, 207 resources, both sitemaps, hidden files, headers, console on every page. Fixed from it: footer overflow on desktop, journal index stacking on phones, catalogue number vs badge on two-up cards, shop bar height after Back to shop, Everyday section count, currency pill, gallery swipe-close, product sitemap URL form, 404s for unknown ids, crawlable headings, legal page share tags, Instagram links in a new tab.
- [ ] **Final look on a phone.** The phone shop changed overnight (two pieces across, Collection picker bar). Open staging on your phone, pick a collection, open a piece, go back, add to cart. Hard refresh first (or clear the tab) or you will see cached photos.
- [ ] **Optional:** delete the gmail copy of contact notifications in Netlify once you are happy shop@ is reliable.

### Craig
- [ ] **Verify the Shopify sender email.** The verification email is waiting at shop@craigspencerceramics.com (sent 12 Oct). Open it and confirm. Until then Shopify sends order emails from a shopifyemail.com fallback address.
- [ ] **Shipping rate.** The flat international rate is now A$33 (same number as before, in AUD). Confirm or change in Settings, Shipping and delivery.
- [ ] **Optional:** Settings, Checkout, apply the recommended "email only, full name required, phone optional".
- [x] **Duplicate product titles tidied in Shopify (13 Oct).** Renamed to Serving Bowl I, Serving Bowl II, Small Bowl I and Petite Vase 16 (the second "Petite Vase 11" is a different vase; 14 stays free for the one awaiting a reshoot). Handles and links unchanged.
- [x] **EUR price rounding, checked 13 Oct: nothing to change.** Shopify fixes the rounding rule per currency. Dollars round to the nearest 1.00, which is why AUD, NZD and USD read as whole numbers; the euro's only choices are "round up to the nearest €0.95" or no rounding at all. It stays on €0.95, the normal euro convention, and the site shows exactly what checkout charges. No settings were changed.
- [ ] **Forward the old email.** The old address at spencerceramics.com.au is Google Workspace (through Wix). In that Gmail: Settings, Forwarding and POP/IMAP, add shop@craigspencerceramics.com (or craig@), confirm the code that arrives in Outlook, then "Forward a copy". Before cancelling Wix: add spencerceramics.com.au as a domain in Microsoft 365, move its MX to Microsoft, and add the old address as an alias on the new mailbox, otherwise the forward dies with the subscription.

## Launch day runbook (done 14 Oct, 11:40 to 11:55 am Pacific)

Me, with you watching:
1. [x] Merge launch-domain into main and push (3:00 pm). It swaps every staging URL to craigspencerceramics.com, adds canonical tags, the old Wix redirects and the launch notes. Build takes about a minute.
2. [x] Netlify: add craigspencerceramics.com and www.craigspencerceramics.com as the project's domains (Domain management, Add domain). Netlify shows the DNS records it wants.
3. [x] GoDaddy DNS: change the A record for @ to Netlify's load balancer address and the CNAME for www to the Netlify site, exactly as Netlify shows. Do not touch the MX, SPF or the onmicrosoft TXT records; they are the email. Also add spencerceramics.com.au to Netlify and point its DNS at Netlify, otherwise the old-site redirects never fire.
4. [x] Certificate covers all four hostnames as of 1:20 pm (the old www name needed its alias removed and re-added in Netlify before Let's Encrypt would issue). Every old Wix URL, with or without www, over http or https, now 301s into the new site. Wait for the certificate (usually 5 to 20 minutes after DNS propagates). Confirm https works on apex and www, and that the apex redirects to www as the launch branch expects.
5. [x] (Not needed: the staging hostname now redirects to the real domain, so the snippet lands in the right place. Optional tidy later.) Shopify theme snippet: Online Store, Themes, Edit code, layout/theme.liquid, change the two spencerceramics.netlify.app URLs to craigspencerceramics.com. Save.
6. [x] Checks on the live domain: home, shop, a product, the Everyday page, the Studio page, contact. /geo, /sitemap.xml, /sitemap-products.xml, one share preview (paste a product link into iMessage or Slack).
7. [ ] One real checkout on the live domain: add a piece, Shopify checkout opens in AUD for an Australian address, NZD for a New Zealand one, policies in the footer. Stop before paying.
8. [ ] Contact form: send one message from the live domain, confirm it arrives at shop@.
9. [ ] Google Search Console: add the domain property, submit both sitemaps.
10. [ ] Instagram bio link and anywhere else the old site was linked: point to craigspencerceramics.com.

Craig on launch day:
- [ ] Post the announcement once step 7 passes. Nothing to do in Shopify.

## Watch for in the first days
- Orders: Shopify emails Craig; check that the sender shows as shop@ once verified.
- Contact messages arriving at shop@ (Netlify notification).
- If a piece sells, the card shows Sold and drops out of the cart automatically.
- Old spencerceramics.com.au links should land on the matching new pages.

## After launch (polish, in order of value)
- Cart: a short message when "+" is pressed on a one-of-one ("only one exists"); a confirm or undo when "−" at 1 removes the line.
- Sticky "Add to cart" bar on the phone product page (the button sits about two screens down).
- Journal post photo sets load lazily; eager-load the first two so they are there when the reader arrives.
- "Added to cart" pulse on the phone cart pill; disable "+" on one-offs; reword the cart note label.
- Closing the product gallery scrolls the page about 160px.
- Instagram links open in the same tab while stockists open new tabs; make consistent.
- Journal post hero placeholder (dark slab while the photo loads) and a srcset for CDN photos.
- Catalogue numbers hard to read on pale product photos.
- Sticky add-to-cart on the phone product page; role="dialog" on the mobile menu.
- Share-card prices show the store currency rather than the visitor's.
- Returns wording ("all sales are final" next to return-shipping rules) and the NZ/AU jurisdiction mix in the legal pages: Craig to confirm with whoever advises him.
- Time zone in Shopify to Sydney; dead code clean-up (commissions CSS and CMS fields, lighting filter, stray "_headers 2", old journal ids in media.js, pin the Sveltia CMS version).

## Done overnight 12 to 13 Oct (for the record)
Home: hero label "New pieces, curated collections", hero type pure white on the golden slides and pure black (with a dark nav) on the white ones, hero button fitted to its label, favourite pieces crops. Studio: plate backdrop is the drying shelves, Selected work shows the table lamp and the black cups, strip photos for the wheel and the kiln, "marks of the maker". Journal: Craig's own photo sets on all three posts (lamps portrait leads To Be Seen), Studio Italia paragraphs in 100 Bowls. Shop: strip banner backdrop, incense holder crop, phones show two pieces across with a pill bar (Collection picker, Sort, Currency, sub-categories beneath). Contact: the hello in the clay as the backdrop; typing recentres the plate and holds it solid. Terms: commissions clause removed. Contact form delivery to shop@ confirmed.

## Done earlier (for the record)
Site: full pre-launch review and High list, Craig's copy and photos, legal and shipping wording (Australia + New Zealand, ships from New Zealand), contact form fixed and registered with Netlify Forms, Load more on the shop, cart hardening, prices with currency signs, in-place currency switch, product sitemap, hidden repo files, cache fixes, version stamp. All live on staging.
Shopify: Basic plan, Australian business entity (Bilambil Heights, ABN on file), store currency AUD, Shopify Payments live on the Australian entity, markets NZD / EUR / USD restored, policies published, private mode off with the myshopify address redirecting to the site, checkout verified end to end from a clean browser, store name and email set.
