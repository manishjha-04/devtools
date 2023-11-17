import { ReactElement, useMemo, useState } from "react";

import { RulesListData } from "devtools/client/inspector/markup/components/rules/RulesListData";
import { GenericList } from "replay-next/components/windowing/GenericList";
import {
  TestEvent,
  TestRunnerName,
  TestSectionName,
} from "shared/test-suites/RecordingTestMetadata";

import { TestListData } from "./TestListData";
import { ITEM_SIZE, TestListItem, TestListItemData } from "./TestListItem";
import { Metadata, TestEventItem, TestSectionEntryWithEvents } from "./types";

export function TestEventsList({
  height,
  noContentFallback,
  testSections,
  testRunnerName,
}: {
  height: number;
  noContentFallback: ReactElement;
  testSections: TestSectionEntryWithEvents[];
  testRunnerName: TestRunnerName | null;
}) {
  const testListData = useMemo(() => new TestListData(testSections), [testSections]);

  const itemData = useMemo<TestListItemData>(
    () => ({
      testRunnerName,
    }),
    [testRunnerName]
  );

  return (
    <GenericList
      dataTestId="TestEventsList"
      fallbackForEmptyList={noContentFallback}
      height={height}
      itemData={itemData}
      itemRendererComponent={TestListItem}
      itemSize={ITEM_SIZE}
      listData={testListData}
      width="100%"
    />
  );
}
