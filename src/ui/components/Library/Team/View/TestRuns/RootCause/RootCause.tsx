import { createContext } from "react";

import { EventKind } from "ui/state/app";

import { Collapsible } from "./Collapsible";
import { ExecutedStatementSequences } from "./ExecutedStatement";
import { ReactComponentSequences } from "./ReactComponent";
import {
  Data,
  Discrepancy,
  ExecutedStatementDiscrepancyType,
  ReactComponentDiscrepancyType,
  Sequence,
} from "./types";

const data: Data = require("./data.json");

function groupSequences(discrepancies: Discrepancy[]) {
  const grouped: Record<EventKind, Record<string, Sequence<Discrepancy>>> = {};

  discrepancies.forEach(d => {
    if (!grouped[d.eventKind]) {
      grouped[d.eventKind] = {};
    }

    const group = grouped[d.eventKind];
    if (!group[d.sequenceId]) {
      group[d.sequenceId] = {
        sequenceId: d.sequenceId,
        kind: d.kind,
        discrepancies: [d],
      };
    } else {
      group[d.sequenceId].discrepancies.push(d);
    }
  });

  return grouped;
}

type RootCauseContextType = {
  failedId: string;
  successId: string;
};

export const RootCauseContext = createContext<RootCauseContextType>(null as any);

export function RootCause() {
  const testFailure = data.discrepancies[0];
  const failedId = testFailure.failedRun.id.recordingId;
  const successId = testFailure.successRun.id.recordingId;
  const groupedSequences = groupSequences(testFailure.discrepancies);

  console.log({ data, groupedSequences });

  return (
    <RootCauseContext.Provider value={{ failedId, successId }}>
      <div className="flex flex-col">
        <div>Root cause</div>
        <div className="flex flex-col gap-4 px-4">
          <Collapsible label="ReactComponent">
            <ReactComponentSequences
              sequences={
                Object.values(
                  groupedSequences["ReactComponent"]
                ) as Sequence<ReactComponentDiscrepancyType>[]
              }
            />
          </Collapsible>
          <Collapsible label="ExecutedStatement">
            <ExecutedStatementSequences
              sequences={
                Object.values(
                  groupedSequences["ExecutedStatement"]
                ) as Sequence<ExecutedStatementDiscrepancyType>[]
              }
            />
          </Collapsible>
        </div>
      </div>
    </RootCauseContext.Provider>
  );
}
