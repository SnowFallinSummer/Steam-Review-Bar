/**
 * Review Bar
 *
 * Replaces Steam review labels with percentage score bars.
 *
 * Supported:
 * - Steam Store / app pages
 * - Steam search results
 * - Steam Wishlist
 *
 * SteamDB elements are ignored.
 */

const PROCESSED_ATTR = 'data-reviewbar-done';
const WISHLIST_PROCESSED_ATTR = 'data-reviewbar-wishlist-done';

/* -------------------------------------------------------------------------- */
/* SteamDB                                                                    */
/* -------------------------------------------------------------------------- */

function isSteamDbElement(element: Element): boolean {
    return (
        element instanceof HTMLAnchorElement &&
        element.href.includes('steamdb.info')
    ) || element.closest('a[href*="steamdb.info"]') !== null;
}

/* -------------------------------------------------------------------------- */
/* Styles                                                                     */
/* -------------------------------------------------------------------------- */

function injectStyles(): void {
    if (document.getElementById('reviewbar-styles')) {
        return;
    }

    const style = document.createElement('style');

    style.id = 'reviewbar-styles';
    style.textContent = `
        :root {
            --reviewbar-positive: #66c0f4;
            --reviewbar-negative: #e14b4b;
            --reviewbar-text: #c6d4df;
            --reviewbar-label: #8f98a0;
        }

        .reviewbar-original-hidden {
            display: none !important;
        }

        .reviewbar {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            min-width: 0;
            white-space: nowrap;
        }

        .reviewbar-track {
            position: relative;
            width: 120px;
            height: 8px;
            flex: 0 0 120px;
            overflow: hidden;
            border-radius: 4px;
            background: var(--reviewbar-negative);
            box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.18);
        }

        .reviewbar-fill {
            width: 0;
            height: 100%;
            background: var(--reviewbar-positive);
        }

        .reviewbar-label {
            color: var(--reviewbar-text);
            font-size: 12px;
            line-height: 16px;
            white-space: nowrap;
        }

        /* Store */

        .reviewbar-store {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            min-height: 18px;
            margin: 3px 0;
            box-sizing: border-box;
        }

        .reviewbar-source-label {
            flex: 0 0 125px;
            width: 125px;
            overflow: hidden;
            color: var(--reviewbar-label);
            font-size: 12px;
            line-height: 16px;
            white-space: nowrap;
            text-overflow: ellipsis;
        }

        .reviewbar-store .reviewbar {
            cursor: pointer;
        }

        .reviewbar-store .reviewbar:hover {
            filter: brightness(1.15);
        }

        /* Search */

        .reviewbar-search-container {
            display: inline-flex;
            align-items: center;
            min-height: 16px;
        }

        .reviewbar-search {
            gap: 6px;
        }

        .reviewbar-search .reviewbar-track {
            width: 82px;
            flex-basis: 82px;
            height: 7px;
        }

        .reviewbar-search .reviewbar-label {
            font-size: 11px;
            line-height: 14px;
        }

        /* Library game details */

        .reviewbar-library-panel {
            margin: 8px 0;
            padding: 12px 14px;
            border-radius: 3px;
            background: var(--reviewbar-panel-background, rgba(0, 0, 0, 0.18));
            color: var(--reviewbar-text);
        }

        .reviewbar-library-heading {
            margin-bottom: 8px;
            color: var(--reviewbar-label);
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.02em;
        }

        .reviewbar-library-panel .reviewbar-track {
            width: 100%;
            max-width: 180px;
            flex-basis: 180px;
        }

        .reviewbar-library-panel .reviewbar-label {
            font-size: 13px;
            font-weight: 600;
        }

        /* Wishlist */

        .reviewbar-wishlist {
            gap: 6px;
            width: 140px;
        }

        .reviewbar-wishlist .reviewbar-track {
            width: 110px;
            flex-basis: 110px;
            height: 7px;
        }

        .reviewbar-wishlist .reviewbar-label {
            font-size: 11px;
            line-height: 14px;
        }

        `;

    document.head.appendChild(style);
}

/* -------------------------------------------------------------------------- */
/* Review score parsing                                                       */
/* -------------------------------------------------------------------------- */

interface ParsedScore {
    positivePct: number;
    reviewCount: number | null;
}

const SCORE_ATTRIBUTES = [
    'data-tooltip-html',
    'data-tooltip-text',
    'title',
    'aria-label',
];

function parseScoreFromText(text: string): ParsedScore | null {
    if (!text) {
        return null;
    }

    const percentageMatch = text.match(
        /(\d{1,3}(?:\.\d+)?)\s*%/,
    );

    if (!percentageMatch) {
        return null;
    }

    const percentage = parseFloat(percentageMatch[1]);

    if (!Number.isFinite(percentage)) {
        return null;
    }

    const positivePct = Math.max(
        0,
        Math.min(100, Math.round(percentage)),
    );

    const cleanedText = text.replace(/,/g, '');

    const countMatch = cleanedText.match(
        /of\s+(?:the\s+)?(\d+)\s+(?:user\s+)?reviews/i,
    );

    return {
        positivePct,
        reviewCount: countMatch
            ? parseInt(countMatch[1], 10)
            : null,
    };
}

function parseScore(element: Element): ParsedScore | null {
    const candidates: string[] = [];

    for (const attribute of SCORE_ATTRIBUTES) {
        const value = element.getAttribute(attribute);

        if (value) {
            candidates.push(value);
        }
    }

    const child = element.querySelector(
        '[data-tooltip-html], [data-tooltip-text], [title], [aria-label]',
    );

    if (child) {
        for (const attribute of SCORE_ATTRIBUTES) {
            const value = child.getAttribute(attribute);

            if (value) {
                candidates.push(value);
            }
        }
    }

    for (const candidate of candidates) {
        const parsed = parseScoreFromText(
            candidate.replace(/<[^>]*>/g, ' '),
        );

        if (parsed) {
            return parsed;
        }
    }

    return parseScoreFromText(
        element.textContent?.trim() ?? '',
    );
}

/* -------------------------------------------------------------------------- */
/* Bar creation                                                               */
/* -------------------------------------------------------------------------- */

type ReviewBarMode = 'normal' | 'search' | 'wishlist';

function buildBar(
    score: ParsedScore,
    mode: ReviewBarMode,
): HTMLDivElement {
    const bar = document.createElement('div');

    bar.className =
        mode === 'search'
            ? 'reviewbar reviewbar-search'
            : mode === 'wishlist'
                ? 'reviewbar reviewbar-wishlist'
                : 'reviewbar';

    bar.title = score.reviewCount
        ? `${score.positivePct}% positive (${score.reviewCount.toLocaleString()} reviews)`
        : `${score.positivePct}% positive`;

    const track = document.createElement('div');
    track.className = 'reviewbar-track';

    const fill = document.createElement('div');
    fill.className = 'reviewbar-fill';
    fill.style.width = `${score.positivePct}%`;

    track.appendChild(fill);

    const label = document.createElement('span');
    label.className = 'reviewbar-label';

    label.textContent = `${score.positivePct}%`;

    bar.append(track, label);

    return bar;
}

function buildStoreBar(
    score: ParsedScore,
    sourceLabel: string,
): HTMLDivElement {
    const container = document.createElement('div');
    container.className = 'reviewbar-store';

    const label = document.createElement('span');
    label.className = 'reviewbar-source-label';
    label.textContent = `${sourceLabel}:`;

    const bar = buildBar(score, 'normal');

    const link = document.createElement('a');
    link.href = '#app_reviews_hash';
    link.className = bar.className;
    link.title = bar.title;
    link.append(...bar.childNodes);
    bar.replaceWith(link);

    container.append(
        label,
        link,
    );

    return container;
}

/* -------------------------------------------------------------------------- */
/* Store pages                                                                */
/* -------------------------------------------------------------------------- */

const STORE_ROW_SELECTOR = '.user_reviews_summary_row';

type StoreReviewType = 'recent' | 'language' | null;

function getStoreReviewType(row: Element): StoreReviewType {
    if (isSteamDbElement(row)) {
        return null;
    }

    const subtitle = row.querySelector('.subtitle');

    if (!subtitle) {
        return null;
    }

    const text =
        subtitle.textContent?.trim().toLowerCase() ?? '';

    if (text.startsWith('recent reviews')) {
        return 'recent';
    }

    if (
        subtitle.classList.contains('all') ||
        text.includes('english reviews') ||
        text === 'all reviews:'
    ) {
        return 'language';
    }

    return null;
}

function getStoreReviewLabel(
    row: Element,
    type: StoreReviewType,
): string {
    const nativeLabel =
        row.querySelector('.subtitle')
            ?.textContent?.trim() ?? '';

    if (nativeLabel) {
        return nativeLabel.replace(/:\s*$/, '');
    }

    return type === 'recent'
        ? 'Recent Reviews'
        : 'Reviews';
}

function processStoreReviewRows(): void {
    document
        .querySelectorAll(STORE_ROW_SELECTOR)
        .forEach((row) => {
            if (row.hasAttribute(PROCESSED_ATTR)) {
                return;
            }

            const type = getStoreReviewType(row);

            if (!type) {
                return;
            }

            const score = parseScore(row);

            if (!score) {
                return;
            }

            row.setAttribute(PROCESSED_ATTR, 'true');
            row.classList.add('reviewbar-original-hidden');

            row.after(
                buildStoreBar(
                    score,
                    getStoreReviewLabel(row, type),
                ),
            );
        });
}

/* -------------------------------------------------------------------------- */
/* Search results                                                             */
/* -------------------------------------------------------------------------- */

const SEARCH_ROW_SELECTOR = '.search_result_row';

const SEARCH_REVIEW_SELECTORS = [
    '.search_review_summary',
    '.search_reviewscore .search_review_summary',
    '.search_reviewscore',
];

function findSearchReviewElement(
    row: Element,
): Element | null {
    for (const selector of SEARCH_REVIEW_SELECTORS) {
        const element = row.querySelector(selector);

        if (
            element &&
            !isSteamDbElement(element) &&
            parseScore(element)
        ) {
            return element;
        }
    }

    return null;
}

function processSearchResults(): void {
    document
        .querySelectorAll(SEARCH_ROW_SELECTOR)
        .forEach((row) => {
            if (row.hasAttribute(PROCESSED_ATTR)) {
                return;
            }

            const reviewElement =
                findSearchReviewElement(row);

            if (!reviewElement) {
                return;
            }

            const score = parseScore(reviewElement);

            if (!score) {
                return;
            }

            row.setAttribute(PROCESSED_ATTR, 'true');

            const replacement =
                document.createElement('span');

            replacement.className =
                'reviewbar-search-container';

            replacement.appendChild(
                buildBar(score, 'search'),
            );

            reviewElement.replaceWith(replacement);
        });
}

/* -------------------------------------------------------------------------- */
/* Wishlist                                                                   */
/* -------------------------------------------------------------------------- */

const WISHLIST_REVIEW_SELECTOR =
    'span[title*="%"][title*="user reviews"]';

function processWishlistReviews(): void {
    document
        .querySelectorAll(WISHLIST_REVIEW_SELECTOR)
        .forEach((reviewElement) => {
            if (
                reviewElement.hasAttribute(
                    WISHLIST_PROCESSED_ATTR,
                )
            ) {
                return;
            }

            const score = parseScore(reviewElement);

            if (!score) {
                return;
            }

            reviewElement.setAttribute(
                WISHLIST_PROCESSED_ATTR,
                'true',
            );

            reviewElement.replaceWith(
                buildBar(score, 'wishlist'),
            );
        });
}

/* -------------------------------------------------------------------------- */
/* Steam Library game details                                                */
/* -------------------------------------------------------------------------- */

const LIBRARY_PANEL_ID = 'reviewbar-library-panel';

function getLibraryAppId(): number | null {
    const match = window.location.pathname.match(/\/library\/app\/(\d+)/);

    if (!match) {
        return null;
    }

    const appId = Number.parseInt(match[1], 10);

    return Number.isSafeInteger(appId) && appId > 0 ? appId : null;
}

function getLibraryReviewScore(appId: number): ParsedScore | null {
    // Millennium exposes Steam's own cached app overview to the client.
    // This avoids an external request and uses the same review percentage
    // Steam already stores for the Library game details view.
    const steamWindow = window as typeof window & {
        appStore?: {
            GetAppOverviewByAppID?: (id: number) => {
                review_score_with_bombs?: number;
                review_percentage_with_bombs?: number;
            } | null;
        };
    };

    const overview = steamWindow.appStore?.GetAppOverviewByAppID?.(appId);

    if (!overview || !Number.isFinite(overview.review_percentage_with_bombs)) {
        return null;
    }

    // Steam uses review_score_with_bombs = 0 when no aggregate score exists.
    if (!overview.review_score_with_bombs) {
        return null;
    }

    return {
        positivePct: Math.max(0, Math.min(100, Math.round(overview.review_percentage_with_bombs!))),
        reviewCount: null,
    };
}

function processLibraryReviewScore(): void {
    const appId = getLibraryAppId();
    if (!appId) {
        document.getElementById(LIBRARY_PANEL_ID)?.remove();
        return;
    }

    const score = getLibraryReviewScore(appId);
    if (!score) {
        document.getElementById(LIBRARY_PANEL_ID)?.remove();
        return;
    }

    const existing = document.getElementById(LIBRARY_PANEL_ID);
    if (existing?.getAttribute('data-appid') === String(appId)) {
        const label = existing.querySelector('.reviewbar-label');
        const fill = existing.querySelector<HTMLElement>('.reviewbar-fill');
        if (label) label.textContent = `${score.positivePct}%`;
        if (fill) fill.style.width = `${score.positivePct}%`;
        return;
    }
    existing?.remove();

    const rightColumn = document.querySelector<HTMLElement>('[class*="RightColumn"]');
    if (!rightColumn) {
        return;
    }

    // Reuse Steam's own right-column section classes when present so the
    // injected review summary follows the Library's native layout.
    const nativeSection = rightColumn.querySelector<HTMLElement>('[class*="RightColumnSection"]');
    const panel = document.createElement('div');
    panel.id = LIBRARY_PANEL_ID;
    panel.setAttribute('data-appid', String(appId));
    panel.className = `reviewbar-library-panel ${nativeSection?.className ?? ''}`.trim();

    const heading = document.createElement('div');
    heading.className = 'reviewbar-library-heading';
    heading.textContent = 'COMMUNITY REVIEWS';

    const bar = buildBar(score, 'normal');
    bar.title = `${score.positivePct}% positive Steam reviews`;

    panel.append(heading, bar);
    rightColumn.prepend(panel);
}

/* -------------------------------------------------------------------------- */
/* Scanner                                                                    */
/* -------------------------------------------------------------------------- */

function scan(): void {
    processStoreReviewRows();
    processSearchResults();
    processWishlistReviews();
    processLibraryReviewScore();
}

let scanQueued = false;

function scheduleScan(): void {
    if (scanQueued) {
        return;
    }

    scanQueued = true;

    queueMicrotask(() => {
        scanQueued = false;
        scan();
    });
}

const observer = new MutationObserver(scheduleScan);

/* -------------------------------------------------------------------------- */
/* Millennium entry point                                                    */
/* -------------------------------------------------------------------------- */

export default function main(): void {
    injectStyles();

    if (document.body) {
        scan();

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        return;
    }

    const waitForBody = new MutationObserver(() => {
        if (!document.body) {
            return;
        }

        waitForBody.disconnect();

        scan();

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    });

    waitForBody.observe(document.documentElement, {
        childList: true,
        subtree: true,
    });
}





