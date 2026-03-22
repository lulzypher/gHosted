# UI Theming & Layout Plans for Mobile & Desktop

Future plans for gHosted mobile and desktop apps: allow users to choose familiar UI themes inspired by popular platforms.

## Goal

**"Grandma, look—it's just like Facebook!"**

Help onboard users by letting them pick a layout/theme that matches an app they already know. Reduces friction when inviting friends and family.

## Target Platforms

| Theme    | Inspiration  | Layout notes                                      |
|----------|--------------|----------------------------------------------------|
| **Twitter/X** | Tweet deck  | Single-column feed, compact posts, trending sidebar |
| **Facebook**  | FB feed     | Two-column (feed + right sidebar), cards, reactions |
| **Tumblr**    | Dashboard   | Masonry/grid, reblog chains, sidebar blogs         |
| **Instagram** | Feed        | Grid-heavy, stories strip, full-bleed media        |
| **LinkedIn**  | Professional| News feed, job-style cards, connections sidebar     |
| **Reddit**    | Threads     | Nested comments, vote-heavy, compact list          |

## Implementation Approach

### Phase 1: CSS/Layout variants

- Define theme tokens: typography, spacing, colors per theme
- Layout components that switch based on `theme` (e.g. `FeedLayout`, `SidebarLayout`)
- Store preference in localStorage / user settings (later: OrbitDB profile)

### Phase 2: Component variants

- `PostCard` renders differently per theme (compact vs. card vs. grid)
- Sidebar layout: left-only, right-only, both, none
- Navigation: top bar, bottom tab bar, sidebar nav

### Phase 3: Full themes

- JSON theme bundles: colors, fonts, spacing, component presets
- Load dynamically: `setTheme('facebook')` applies the full preset

## Technical Considerations

- **Mobile (Android / iOS)**: React Native or Capacitor; themes apply across native shell
- **Desktop (Win / Mac / Linux)**: Electron or Tauri; same web components with theme classes

## User Flow

1. On first launch or in Settings
2. User sees: "Choose a layout that feels familiar"
3. Grid of previews: [Twitter] [Facebook] [Tumblr] [Minimal] …
4. Selection saved and applied immediately
5. Can switch anytime in Settings

## Status

- **Planned** for mobile and desktop app phases
- Web app can adopt a subset (e.g. Twitter/Facebook/Tumblr layouts) as CSS variants first
