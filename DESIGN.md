# Design

This describes the public landing page (`apps/landing`). The admin panel keeps its own dark zinc and violet system.

## World

A railway station departure board. Gaming cafes already call their seats stations, and the product is about time, so the page reads like a timetable in enamel green and signal amber.

## Tokens (`landing.css`)

| Token | Value | Use |
|---|---|---|
| `--pine` | `#0c4335` | Main ground |
| `--pine-deep` | `#08302a` | Header, board, footer |
| `--pine-lift` / `--pine-line` | `#135a48` / `#2c7a65` | Raised surfaces, rules |
| `--chalk` | `#eaf2e6` | Light bands, text on pine |
| `--mist` | `#bfd8cb` | Secondary text on pine |
| `--amber` | `#ffc62b` | The one action color and the kiosk band |
| `--ink` | `#06221c` | Text on chalk |
| `--alert` | `#ffb4a2` | Taken stations, errors |

## Type

Onest Variable for Latin and Cyrillic, Noto Sans Georgian Variable for Georgian. Both are self-hosted. Headings are extra-bold with tight tracking. Georgian gets slightly smaller sizes and looser line height. Numbers are tabular.

## Components

- **Board:** the working booking form in the first viewport. Station tiles are split-flap panels with hinge pins, and their status flips when it changes.
- **Route:** booking steps as stops on one amber rail.
- **Timetable:** features as ruled rows, not cards.

## Rules

- No eyebrow labels, gradient text, glass, or icon-tile card grids.
- Amber marks what can be acted on.
- Motion is limited to the flap flip and small hover shifts, and respects reduced motion.
