# Review Bar

Review Bar replaces Steam's text-based review summaries with compact positive-percentage bars. It uses review information already supplied by Steam and does not make external review API requests.

## Where it works

- **Steam Store app pages:** Replaces the recent-review and overall/language-review summaries with labeled percentage bars. Clicking a bar jumps to the reviews section.
- **Steam search results:** Replaces the review summary with a compact percentage bar.
- **Steam Wishlist:** Replaces the review percentage text with a bar.
- **Steam header:** Hides the global Steam header in the embedded Store view, matching the working configuration.

The Store, Search, and Wishlist features run in Steam's WebKit browser context. Review percentages are read from Steam's existing tooltip and accessibility metadata. SteamDB elements are ignored.

## Library integration

The Library integration targets Steam's `/library/app/:appid` route through Millennium's frontend router hook. It reads the review overview already passed through Steam's app-details component tree and adds a **Community Reviews** section using Steam's `PanelSection`, `PanelSectionRow`, and `ProgressBar` components.

This integration depends on Steam's internal React component structure and class mappings, which Valve can change. If the expected app-details component or container is not present, Review Bar leaves the Library page unchanged. It does not fetch review data from a separate API.

## Build

Requirements: [Millennium](https://github.com/SteamClientHomebrew/Millennium) and [Bun](https://bun.sh/).

```sh
bun install
bun run build
```

Starlight packages the plugin using the checked-in `millennium.toml`.

## Implementation notes

- Store, Search, and Wishlist selectors and score parsing are in `webview/preload.ts`.
- The Library route integration is in `frontend/index.tsx`.
- Steam may change its DOM metadata, React component tree, or class mappings; those integration points may need maintenance.

## AI assistance

AI tools assisted with parts of development and troubleshooting. The maintainer reviews, tests, and maintains the code. This disclosure is included for submission transparency.

## License

MIT. See [LICENSE](LICENSE).
