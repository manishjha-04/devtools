import { useContext } from "react";

import { Collapsible } from "./Collapsible";
import { RootCauseContext } from "./RootCause";
import {
  NetworkEventDiscrepancyType,
  NetworkEventExtraResponseDiscrepancyType,
  NetworkEventMissingRequestDiscrepancyType,
  NetworkEventMissingResponseDiscrepancyType,
  Sequence,
} from "./types";

export function NetworkEventSequences({
  sequences,
}: {
  sequences: Sequence<NetworkEventDiscrepancyType>[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {sequences.map((d, i) => (
        <NetworkEventSequence group={d} key={i} />
      ))}
    </div>
  );
}
function NetworkEventSequence({ group }: { group: Sequence<NetworkEventDiscrepancyType> }) {
  return (
    <div className="pl-4">
      <Collapsible label={`(${group.kind}) ${group.sequenceId}`}>
        <div className="pl-4">
          <div className="flex flex-col gap-2">
            {group.discrepancies.map((d, i) => (
              <NetworkEventDiscrepancy key={i} discrepancy={d} />
            ))}
          </div>
        </div>
      </Collapsible>
    </div>
  );
}

function ReplayLink({
  id,
  kind,
  result,
}: {
  id: string;
  kind: "extra" | "missing";
  result: "passing" | "failing";
}) {
  return (
    <a href={`/recording/${id}`} target="_blank" rel="noreferrer">
      Go to <span className="italic">{kind}</span> point in <span className="italic">{result}</span>{" "}
      replay
    </a>
  );
}

function ExtraResponse({
  label,
  value,
  alternateValue,
}: {
  label: string;
  value: any;
  alternateValue: any;
}) {
  const { failedId } = useContext(RootCauseContext);

  return (
    <Collapsible label={`(Extra+Response) ${label}`}>
      <div className="flex flex-col gap-1 pl-4">
        <div className="flex flex-row gap-4">
          <div>
            <div>Passing value</div>
            <div className="whitespace-pre font-mono">
              {JSON.stringify(alternateValue, null, 2)}
            </div>
          </div>
          <div>
            <div>Failing value</div>
            <div className="whitespace-pre font-mono">{JSON.stringify(value, null, 2)}</div>
          </div>
        </div>
        <ReplayLink id={failedId} kind="extra" result="failing" />
      </div>
    </Collapsible>
  );
}

function ExtraRequest({ label }: { label: string }) {
  const { failedId } = useContext(RootCauseContext);

  return (
    <Collapsible label={`(Extra+Request) ${label}`}>
      <div className="flex flex-col gap-1 pl-4">
        <ReplayLink id={failedId} kind="extra" result="failing" />
      </div>
    </Collapsible>
  );
}

function MissingResponse({
  label,
  path,
  requestTag,
  requestUrl,
}: {
  label: string;
  path: string;
  requestTag: string;
  requestUrl: string;
}) {
  const { successId } = useContext(RootCauseContext);

  return (
    <Collapsible label={`(Missing+Response) ${label}`}>
      <div className="flex flex-col gap-1 pl-4">
        <div className="flex flex-col">
          <div>path: {path}</div>
          <div>requestTag: {requestTag}</div>
          <div>requestTag: {requestUrl}</div>
        </div>
        <ReplayLink id={successId} kind="missing" result="passing" />
      </div>
    </Collapsible>
  );
}

function MissingRequest({
  label,
  requestMethod,
  requestUrl,
}: {
  label: string;
  requestMethod: string;
  requestUrl: string;
}) {
  const { successId } = useContext(RootCauseContext);

  return (
    <Collapsible label={`(Missing+Response) ${label}`}>
      <div className="flex flex-col gap-1 pl-4">
        <div className="flex flex-col">
          <div>requestMethod: {requestMethod}</div>
          <div>requestTag: {requestUrl}</div>
        </div>
        <ReplayLink id={successId} kind="missing" result="passing" />
      </div>
    </Collapsible>
  );
}

function NetworkEventDiscrepancy({ discrepancy }: { discrepancy: NetworkEventDiscrepancyType }) {
  const {
    kind,
    event: { data },
  } = discrepancy;
  let content;

  if (kind == "Extra") {
    if (data.kind === "ResponseJSON") {
      const {
        event: { data, alternate, key },
      } = discrepancy as NetworkEventExtraResponseDiscrepancyType;

      content = <ExtraResponse label={key} value={data.value} alternateValue={alternate.value} />;
    } else if (data.kind === "Request") {
      content = <ExtraRequest label="TODO" />;
    }
  } else {
    if (data.kind === "ResponseJSON") {
      const {
        event: {
          data: { path, requestTag, requestUrl },
          key,
        },
      } = discrepancy as NetworkEventMissingResponseDiscrepancyType;

      content = (
        <MissingResponse label={key} path={path} requestTag={requestTag} requestUrl={requestUrl} />
      );
    } else if (data.kind === "Request") {
      const {
        event: {
          data: { requestMethod, requestUrl },
          key,
        },
      } = discrepancy as NetworkEventMissingRequestDiscrepancyType;

      content = (
        <MissingRequest requestMethod={requestMethod} requestUrl={requestUrl} label={key} />
      );
    }
  }
  return <div>{content}</div>;
}
