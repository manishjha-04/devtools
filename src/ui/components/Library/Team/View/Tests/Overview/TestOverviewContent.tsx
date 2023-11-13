import orderBy from "lodash/orderBy";
import { useContext, useState } from "react";
import { FailureRates, __EXECUTION } from "shared/test-suites/TestRun";
import { TestContext } from "../TestContextRoot";
import styles from "../../../../Library.module.css";

export function TestOverviewContent() {
  const { filterByText, testId, tests } = useContext(TestContext);
  const hasFilters = filterByText !== "";
  const test = tests.find(test => test.testId === testId);

  let children = null;

  if (test) {
    if (!hasFilters || tests.find(test => test.testId === testId)) {
      children = (
        <div
          className="flex flex-col gap-1 border-b border-themeBorder py-2 px-4"
          data-test-id="TestRunSummary"
        >
          <div className="flex flex-row items-center justify-between gap-1">
            <div className="overflow-hidden overflow-ellipsis whitespace-nowrap text-lg font-medium">
              {test.title}
            </div>
          </div>
          <Stats failureRates={test.failureRates} />
          <ErrorFrequency errorFrequency={test.errorFrequency} executions={test.executions} />
        </div>
      );
    }
  }

  return (
    <div className={`flex h-full flex-col text-sm transition ${styles.runOverview} `}>
      {children}
    </div>
  );
}

function ErrorFrequency({
  errorFrequency,
  executions,
}: {
  errorFrequency: Record<string, number>;
  executions: __EXECUTION[];
}) {
  const [selectedError, setSelectedError] = useState<string | null>(null);

  const passing = executions.filter(e => e.result === "passed");
  const failing = executions.filter(e => e.result === "failed");
  const sortedFailing = orderBy(failing, "createdAt", "desc");
  const sortedPassing = orderBy(passing, "createdAt", "desc");

  return (
    <div>
      <div>Top Errors</div>
      <div>
        {Object.entries(errorFrequency).map(([msg, count]) => (
          <div
            key={msg}
            className="overflow-hidden overflow-ellipsis whitespace-nowrap"
            onClick={() => setSelectedError(msg)}
          >
            {count}: {msg}
          </div>
        ))}
      </div>
      {selectedError ? (
        <div>
          <div className="overflow-hidden overflow-ellipsis whitespace-nowrap">
            Selected error: {selectedError}
          </div>
          <div>
            <div>Replay that contain this error</div>
            <div>
              {sortedFailing.slice(0, 3).map((e, i) => (
                <div key={i}>{e.createdAt}</div>
              ))}
            </div>
          </div>
          <div>
            <div>Recent replays of the test passing</div>
            <div>
              {sortedPassing.slice(0, 3).map((e, i) => (
                <div key={i}>{e.createdAt}</div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stats({ failureRates }: { failureRates: FailureRates }) {
  const { hour, day, week, month } = failureRates;

  return (
    <div>
      <div>
        <div>Historical failure rate</div>
        <div className="flex">
          <div className="flex w-24 flex-col">
            <div>{(hour * 100).toFixed(2)}%</div>
            <div>This Hour</div>
          </div>
          <div className="flex w-24 flex-col">
            <div>{(day * 100).toFixed(2)}%</div>
            <div>Day</div>
          </div>
          <div className="flex w-24 flex-col">
            <div>{(week * 100).toFixed(2)}%</div>
            <div>Week</div>
          </div>
          <div className="flex w-24 flex-col">
            <div>{(month * 100).toFixed(2)}%</div>
            <div>Month</div>
          </div>
        </div>
      </div>
    </div>
  );
}
