# LoudBuzz site (Cloudflare Pages + GitHub)

## Structure
- `index.html` - LoudBuzz landing page (loudbuzz.lifehutsolutions.com)
- `dora/` - one folder per shop: `index.html`, `template.png`, `brand.json`
- `assets/` - shared booth code (booth.js, booth.css) and LoudBuzz logo

## Add a new shop
1. Copy the `dora` folder and rename it to the shop name in lowercase letters, e.g. `shop2` (this becomes the link /shop2/).
2. Replace `template.png` with the shop's 9:16 frame. The photo window must be solid magenta #FF00FF (or truly transparent).
3. Edit `brand.json` with the shop name, e.g. {"name": "Shop Two"}.
4. Commit and push to GitHub. Cloudflare Pages redeploys automatically.
5. Open loudbuzz.lifehutsolutions.com/shop2/ on a phone, test, then make the QR code from that link.

## Deploy
1. Push this folder to a GitHub repository.
2. Cloudflare dashboard > Workers & Pages > Create > Pages > Connect to Git > pick the repo. Build command: none. Output directory: / (root).
3. Pages project > Custom domains > add loudbuzz.lifehutsolutions.com and add the DNS record Cloudflare shows (a CNAME if the domain's DNS is elsewhere).
4. Keep the old subdomain forwarding to the new domain if you move to LoudBuzz.com, so printed QR codes keep working.
