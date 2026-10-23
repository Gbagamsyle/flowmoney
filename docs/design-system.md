# Design system

## Lime accent experiment

This branch tests `#3FFF00` as FlowMoney's primary accent without changing its neutral
light and dark surfaces, typography, spacing, or risk/status colors.

- Use vivid lime for primary actions, selected controls, focus emphasis, and small decorative
  highlights. Primary action text uses a near-black foreground for contrast.
- Use a lime tile behind the brand mark with the dark logo artwork so the logo remains
  legible in both light and dark themes.
- Use the `primary-ink` theme token for text and icons that need a green accent. It is a
  darker green on light surfaces and a lighter green in dark mode; do not use vivid lime for
  small text on white or gray backgrounds.
- Keep lime-tinted surfaces subtle. Do not use the accent to imply that a financial outcome
  is safe or guaranteed; risk continues to be communicated with explicit labels and existing
  status colors.
- Apply the shared tokens from `packages/ui/src/styles/globals.css` rather than introducing
  one-off green values in individual screens.

This is an isolated visual experiment on `feat/design-lime-3fff00`; review it in both light
and dark mode and at mobile widths before deciding whether to keep the palette.