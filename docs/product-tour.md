# First-use product walkthrough

After account setup, the signed-in app offers a welcome screen and nine short section explanations.
The desktop panel follows the highlighted navigation item; smaller screens use a sheet above the
bottom navigation. The walkthrough does not navigate away or change financial records.

Users can go back, skip, close with Escape, or finish. Settings → Help & feedback → Take the product
tour reopens it. Product tour and problem reporting have separate descriptions and actions.

Completion or skipping is stored in localStorage under `flowmoney:product-tour:v1:<Clerk user ID>`.
It is per user and browser, not synchronized across devices. If browser storage is unavailable,
automatic launch is suppressed and replay remains available. No financial data is stored by the tour.

The native modal dialog traps focus and restores the previous focus when closed. Motion is disabled
when the device requests reduced motion. No dependencies, environment variables or database
migrations are required.

Validation includes component browser checks at 320×740, 390×844, 844×390 and 1440×900. All nine
steps fit within each viewport. Welcome and three walkthrough checkpoints pass automated dialog
accessibility checks in light and dark themes (32 checks). Navigation, Escape, skip, completion,
persistence, replay, desktop movement and reduced motion are exercised. These checks use stubbed
authentication; the main authenticated journey also covers first launch, skipping and Settings replay.
