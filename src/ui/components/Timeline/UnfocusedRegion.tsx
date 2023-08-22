import clamp from "lodash/clamp";

import { selectors } from "ui/reducers";
import { useAppSelector } from "ui/setup/hooks";
import { getVisiblePosition } from "ui/utils/timeline";

export default function UnfocusedRegion() {
  const focusWindow = useAppSelector(selectors.getDisplayedFocusWindow);
  const zoomRegion = useAppSelector(selectors.getZoomRegion);

  if (!focusWindow) {
    return null;
  }

  const beginTime = focusWindow!.begin.time;
  const endTime = focusWindow!.end.time;
  const duration = zoomRegion.endTime - zoomRegion.beginTime;

  const start = getVisiblePosition({ time: beginTime, zoom: zoomRegion }) * 100;
  const end = getVisiblePosition({ time: duration - endTime, zoom: zoomRegion }) * 100;

  return (
    <>
      <div
        className="unfocused-regions-container start"
        title="This region is unfocused"
        style={{
          width: `${clamp(start, 0, 100)}%`,
        }}
      >
        <div className="unfocused-regions" />
      </div>
      <div
        className="unfocused-regions-container end"
        title="This region is unfocused"
        style={{
          width: `${clamp(end, 0, 100)}%`,
        }}
      >
        <div className="unfocused-regions" />
      </div>
    </>
  );
}
