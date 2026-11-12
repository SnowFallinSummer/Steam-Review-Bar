import {
  afterPatch,
  appDetailsClasses,
  createReactTreePatcher,
  definePlugin,
  findInReactTree,
  PanelSection,
  PanelSectionRow,
  ProgressBar,
  routerHook,
} from 'millennium';
import type { ReactElement } from 'react';

interface SteamAppOverview {
  appid?: number;
  review_score_with_bombs?: number;
  review_percentage_with_bombs?: number;
}

interface ReviewScoreSectionProps {
  overview: SteamAppOverview;
}

const REVIEW_SECTION_KEY = 'review-bar-community-reviews';
const LIBRARY_APP_ROUTE = '/library/app/:appid';

/**
 * Renders the cached Steam review score with Steam's own React components.
 * Steam uses review_score_with_bombs === 0 when no aggregate score is available.
 */
function ReviewScoreSection({ overview }: ReviewScoreSectionProps) {
  const score = overview.review_percentage_with_bombs;

  if (
    !overview.review_score_with_bombs ||
    typeof score !== 'number' ||
    !Number.isFinite(score) ||
    score < 0 ||
    score > 100
  ) {
    return null;
  }

  const percentage = Math.round(score);

  return (
    <PanelSection title="Community Reviews">
      <PanelSectionRow>
        {percentage}% positive
        <ProgressBar nProgress={percentage / 100} />
      </PanelSectionRow>
    </PanelSection>
  );
}

/**
 * Hooks the actual Steam Library game-details route. The patch is deliberately
 * defensive: if Steam changes the component tree or its class map, the page is
 * left untouched instead of interrupting the Library.
 */
function patchLibraryRoute(routerTree: any): any {
  try {
    const routeProps = findInReactTree(
      routerTree,
      (node: any) => typeof node?.renderFunc === 'function',
    );

    if (!routeProps) {
      return routerTree;
    }

    let overview: SteamAppOverview | undefined;

    const renderPatch = createReactTreePatcher(
      [
        (tree: any) => {
          const appDetails = findInReactTree(
            tree,
            (node: any) => Boolean(node?.props?.children?.props?.overview),
          )?.props?.children;

          overview = appDetails?.props?.overview;
          return appDetails ?? null;
        },
      ],
      (_args: any[], rendered?: ReactElement) => {
        try {
          if (
            !rendered ||
            !overview ||
            !appDetailsClasses?.InnerContainer
          ) {
            return rendered;
          }

          const container = findInReactTree(
            rendered,
            (node: any) =>
              Array.isArray(node?.props?.children) &&
              typeof node?.props?.className === 'string' &&
              node.props.className.includes(appDetailsClasses.InnerContainer),
          );

          if (!container?.props) {
            return rendered;
          }

          const children = [...container.props.children].filter(
            (child: any) => child?.key !== REVIEW_SECTION_KEY,
          );

          children.splice(
            Math.min(1, children.length),
            0,
            <ReviewScoreSection
              key={REVIEW_SECTION_KEY}
              overview={overview}
            />,
          );

          container.props.children = children;
        } catch (error) {
          console.warn('[Review Bar] Could not add Library review section; leaving the page unchanged.', error);
        }

        return rendered;
      },
      'ReviewBarLibraryScore',
    );

    afterPatch(routeProps, 'renderFunc', renderPatch);
  } catch (error) {
    console.warn('[Review Bar] Library route hook failed; leaving the page unchanged.', error);
  }

  return routerTree;
}

export default definePlugin(() => {
  const routePatch = routerHook.addPatch(
    LIBRARY_APP_ROUTE,
    patchLibraryRoute,
  );

  return {
    title: 'Review Bar',
    icon: <></>,
    onDismount: () => {
      routerHook.removePatch(LIBRARY_APP_ROUTE, routePatch);
    },
  };
});
