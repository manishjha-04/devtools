export function ReplayLink({
  id,
  kind,
  result,
  point,
  time,
}: {
  id: string;
  kind: "extra" | "missing";
  result: "passing" | "failing";
  point: string;
  time: number;
}) {
  return (
    <div className="flex self-end rounded-md bg-gray-500 px-3 py-2">
      <a
        href={`/recording/${id}?point=${point}&time=${time}`}
        target="_blank"
        rel="noreferrer"
        className="flex flex-row items-center gap-2"
      >
        <div className="h-5 w-5 rounded-full bg-white" />
        <div>Investigate</div>
      </a>
    </div>
  );
}
