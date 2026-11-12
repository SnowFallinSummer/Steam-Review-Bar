import {
  afterPatch,
  appDetailsClasses,
  createReactTreePatcher,
  definePlugin,
  findInReactTree,
  IconsModule,
  PanelSection,
  PanelSectionRow,
  ProgressBar,
  routerHook,
} from 'millennium';
import type { ReactElement } from 'react';

interface SteamAppOverview {
  review_score_with_bombs?: number;
  review_percentage_with_bombs?: number;
}

interface ReviewScoreSectionProps {
  overview: SteamAppOverview;
}

const REVIEW_SECTION_KEY = 'review-bar-community-reviews';
const LIBRARY_APP_ROUTE = '/library/app/:appid';
const renderPatches = new Set<{ unpatch: () => void; hasUnpatched: boolean }>();

let currentOverview: SteamAppOverview | undefined;

/**
 * Renders Steam's cached community review percentage with native Steam UI.
 * A score of zero means Steam has no aggregate review score for the app.
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
 * Millennium's RoutePatch receives React Router route props. Its actual route
 * element is in route.children; there is no documented renderFunc property.
 *
 * Patch that element's component return tree, then patch the Steam app-details
 * component found in that tree. The patcher caches component types so normal
 * route rerenders do not repeatedly wrap the same Steam component.
 */
const libraryRenderPatch = createReactTreePatcher(
  [
    (tree: any) => {
      const appDetails = findInReactTree(
        tree,
        (node: any) =>
          Boolean(node?.type && node?.props?.children?.props?.overview),
      )?.props?.children;

      currentOverview = appDetails?.props?.overview;
      return appDetails ?? null;
    },
  ],
  (_args: any[], rendered?: ReactElement) => {
    try {
      const overview = currentOverview;

      if (!rendered || !overview || !appDetailsClasses?.InnerContainer) {
        return rendered;
      }

      const container = findInReactTree(
        rendered,
        (node: any) =>
          Boolean(node?.type) &&
          typeof node?.props?.className === 'string' &&
          node.props.className.includes(appDetailsClasses.InnerContainer),
      );

      if (!container?.props) {
        return rendered;
      }

      const currentChildren = container.props.children;
      const children = Array.isArray(currentChildren)
        ? [...currentChildren]
        : currentChildren == null
          ? []
          : [currentChildren];

      if (children.some((child: any) => child?.key === REVIEW_SECTION_KEY)) {
        return rendered;
      }

      children.splice(
        Math.min(1, children.length),
        0,
        <ReviewScoreSection key={REVIEW_SECTION_KEY} overview={overview} />,
      );

      container.props.children = children;
    } catch (error) {
      console.warn(
        '[Review Bar] Could not add Library review section; leaving the page unchanged.',
        error,
      );
    }

    return rendered;
  },
  'ReviewBarLibraryScore',
);

function patchLibraryRoute(route: any): any {
  try {
    const routeElement = route?.children;

    if (!routeElement || typeof routeElement.type !== 'function') {
      return route;
    }

    const patch = afterPatch(routeElement, 'type', libraryRenderPatch);
    renderPatches.add(patch);
  } catch (error) {
    console.warn(
      '[Review Bar] Library route hook failed; leaving the page unchanged.',
      error,
    );
  }

  return route;
}

export default definePlugin(() => {
  const routePatch = routerHook.addPatch(
    LIBRARY_APP_ROUTE,
    patchLibraryRoute,
  );

  return {
    title: 'Review Bar',
    icon: <IconsModule.Settings />,
    onDismount: () => {
      routerHook.removePatch(LIBRARY_APP_ROUTE, routePatch);

      for (const patch of renderPatches) {
        if (!patch.hasUnpatched) {
          patch.unpatch();
        }
      }

      renderPatches.clear();
    },
  };
});
