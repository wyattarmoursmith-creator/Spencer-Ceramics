# Launch runbook: craigspencerceramics.com

Everything below is staged. Nothing is public on the new domain until step 3.
Both domains live in Craig's GoDaddy account (nameservers stay at GoDaddy).

## 0. Before the day
- Merge this branch into main and push (it swaps every site URL to craigspencerceramics.com and adds the old-site redirects).
- Confirm shop@craigspencerceramics.com receives mail (the domain has GoDaddy mail: MX smtp.secureserver.net, SPF, DKIM, DMARC all present).
- Fill the legal placeholders on /privacy and /terms.
- Turn on Netlify Forms and add the notification email (see step 4).

## 1. Netlify: add both domains (from the repo, CLI is already logged in as Wyatt)
    npx netlify-cli api updateSite --data '{"site_id":"51e0ac33-37e2-4383-aba1-c71de7644268","body":{"custom_domain":"craigspencerceramics.com","domain_aliases":["www.craigspencerceramics.com","spencerceramics.com.au","www.spencerceramics.com.au"]}}'
Netlify will show "Awaiting external DNS" until step 3 completes, then issue certificates for all four hostnames on its own.
NOTE: do this on launch day, not before. Once a custom domain is set, Netlify redirects spencerceramics.netlify.app to it, so the temp URL stops working the moment this runs.

## 2. GoDaddy DNS: craigspencerceramics.com (new site)
Change ONLY these two records. Leave MX, both TXT (SPF, _dmarc), the four mail CNAMEs (bounces.*, *._domainkey), NS, SOA and _domainconnect exactly as they are.
| Type  | Name | Current value        | New value                      |
|-------|------|----------------------|--------------------------------|
| A     | @    | WebsiteBuilder Site  | 75.2.60.5                      |
| CNAME | www  | craigspencerceramics.com. | spencerceramics.netlify.app. |
(75.2.60.5 is Netlify's load balancer. If GoDaddy refuses to edit the "WebsiteBuilder Site" A record, disconnect the Website Builder product from the domain first, then add the A record.)

## 3. GoDaddy DNS: spencerceramics.com.au (old Wix site -> redirects)
Change ONLY these two. Leave the Google Workspace MX records, the SPF and google-site-verification TXT records, NS and SOA alone: Craig's old-domain email keeps working.
| Type  | Name | Current value      | New value                      |
|-------|------|--------------------|--------------------------------|
| A     | @    | 23.236.62.147      | 75.2.60.5                      |
| CNAME | www  | www76.wixdns.net.  | spencerceramics.netlify.app.   |
After this, every old Wix URL 301s to its new page (mapping in _redirects). Keep the Wix subscription until the redirects are confirmed, then cancel it.

## 4. Netlify Forms (the contact form currently has no notification)
Enable Forms on the project (Project configuration > Forms), then add an email notification to shop@craigspencerceramics.com. Send a test message from /contact.

## 5. Google
- Search Console: add craigspencerceramics.com as a Domain property (DNS TXT record at GoDaddy), submit https://craigspencerceramics.com/sitemap.xml.
- The old domain is already verified in Search Console (google-site-verification TXT exists on spencerceramics.com.au): in that property, use Change of Address -> craigspencerceramics.com.
- Google Business Profile: point the website field at the new domain.

## 6. Verify (10 minutes after DNS)
    curl -sI https://craigspencerceramics.com | head -3
    curl -sI https://www.craigspencerceramics.com | grep -i location
    curl -sI https://spencerceramics.com.au/about | grep -i location
    curl -sI https://www.spencerceramics.com.au/shipping-returns | grep -i location
Then place a real test order and refund it.
