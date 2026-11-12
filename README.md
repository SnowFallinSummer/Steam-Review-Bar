# Review Bar

Review Bar replaces Steam's text-based review summaries with compact positive-percentage bars. It uses review information already supplied by Steam and does not make external review API requests.

## Where it works

- **Steam Store app pages:** Replaces the recent-review and overall/language-review summaries with labeled percentage bars. Clicking a bar jumps to the reviews section.
- **Steam search results:** Replaces the review summary with a compact percentage bar.
- **Steam Wishlist:** Replaces the review percentage text with a bar.
- **Steam header:** Hides the global Steam header in the embedded Store view, matching the working configuration.

The Store, Search, and Wishlist features run in Steam's WebKit browser context. Review percentages are read from Steam's existing tooltip and accessibility metadata. SteamDB elements are ignored.

## Build

Requirements: [Millennium](https://github.com/SteamClientHomebrew/Millennium) and [Bun](https://bun.sh/).

```sh
bun install
bun run build
```

Starlight packages the plugin using the checked-in `millennium.toml`.

## Implementation notes

- Store, Search, and Wishlist selectors and score parsing are in `webview/preload.ts`.
- Steam may change its DOM metadata or tooltip markup; those integration points may need maintenance.
- Review Bar reads review information already present in Steam's page and does not query an external review API.

## AI assistance

AI tools assisted with parts of development and troubleshooting. The maintainer reviews, tests, and maintains the code. This disclosure is included for submission transparency.

## License

MIT. See [LICENSE](LICENSE).
