# Overview presentation

The original Overview layout is retained: a prominent safe-to-spend card, three supporting balance cards, account notes, two forecast cards and side-by-side commitments/income lists. Card refinements use consistent padding, restrained icons, clear amount hierarchy and responsive wrapping. Supporting cards have equal height.

The estimate excludes expected income and Planning allocations. Unpaid commitments are described as deductions from the estimate rather than money physically moved. Forecasts remain conditional. Mixed-currency records are now normalized to the selected display currency using one cached exchange-rate snapshot before Overview and Scenario calculations. Original values are preserved. Unconfirmed legacy currencies block combined totals; unavailable rates never fall back to relabeling. Conversions are reference estimates, with source and update time disclosed.

Refreshes abort superseded requests and retain labelled last-loaded figures on failure. Auth/currency changes clear data. Lists are filtered and sorted without mutating source records. Loading, empty and retry states and consent-gated analytics remain supported.

Visual refinements retain the original layout: neutral light/dark card surfaces, fine borders, consistent corners, restrained number sizing and plain risk labels. The main balance is distinguished through typography and border contrast. Low-risk status uses a shield rather than a warning icon. List links have explicit View all labels and keyboard focus outlines. The separate lime-color experiment uses shared theme tokens documented in [design-system.md](design-system.md), keeping vivid lime for filled actions and soft accents while using accessible green shades for text.
