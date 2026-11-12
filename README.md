# Review Bar

Review Bar replaces Steam's text-based review summaries with compact positive/negative percentage bars.

## Where it works

- **Steam Store app pages:** Replaces the recent-review and overall/language-review summaries with labeled percentage bars. Clicking a bar jumps to the reviews section.
- **Steam search results:** Replaces the review summary with a compact percentage bar.
- **Steam Wishlist:** Replaces the review percentage text with a bar.
- **Steam Library game details:** Adds a Community Reviews section using Steam's cached app overview and Steam's own React components.

The Store, Search, and Wishlist views run in Steam's WebKit browser context, where Steam does not expose its React component tree. The Library integration runs in the Steam frontend and uses Millennium's router hook plus Steam UI components. Review Bar does not make external review API requests.

## Build

Requirements: [Millennium](https://github.com/SteamClientHomebrew/Millennium) and [Bun](https://bun.sh/).

```sh
bun install
bun run build
```

Starlight packages the plugin using the checked-in `millennium.toml`.

## Implementation notes

- Store/Search/Wishlist review percentages are read from Steam's existing tooltip and accessibility metadata.
- Library review percentages are read from `appStore.GetAppOverviewByAppID(appId)`, specifically `review_percentage_with_bombs`.
- The Library patch targets `/library/app/:appid` and inserts a Steam-native `PanelSection` with Steam's `ProgressBar` component. If the expected Steam component tree is unavailable, the patch leaves the Library page unchanged.
- Steam may change its DOM metadata or internal React component structure. The relevant integration points are isolated in `webview/preload.ts` and `frontend/index.tsx`.

## AI assistance

AI tools assisted with parts of development and troubleshooting. The maintainer reviews, tests, and maintains the code. This disclosure is included in accordance with the PluginDatabase submission guidelines.

## License

MIT. See [LICENSE](LICENSE).
