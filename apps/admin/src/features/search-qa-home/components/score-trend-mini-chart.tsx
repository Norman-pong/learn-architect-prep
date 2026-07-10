import { cn } from "@/lib/utils";

export type ExamType = "comprehensive" | "case" | "essay";

export interface ScoreTrendPoint {
  date: string;
  score: number;
  passed: boolean;
}

export interface ScoreTrendSeries {
  examType: ExamType;
  label: string;
  points: ScoreTrendPoint[];
}

export interface ScoreTrendMiniChartProps {
  series: ScoreTrendSeries[];
  passScore?: number;
  width?: number;
  height?: number;
  className?: string;
}

const EXAM_TYPE_ORDER: ExamType[] = ["comprehensive", "case", "essay"];

const COLOR_BY_TYPE: Record<ExamType, string> = {
  comprehensive: "hsl(var(--chart-1))",
  case: "hsl(var(--chart-2))",
  essay: "hsl(var(--chart-3))",
};

const LABEL_BY_TYPE: Record<ExamType, string> = {
  comprehensive: "综合知识",
  case: "案例分析",
  essay: "论文",
};

function formatDate(dateStr: string) {
  const date = new Date(String(dateStr));
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export default function ScoreTrendMiniChart({
  series,
  passScore = 45,
  width = 600,
  height = 120,
  className,
}: ScoreTrendMiniChartProps) {
  const margin = { top: 12, right: 24, bottom: 32, left: 32 };
  const innerWidth = Math.max(0, width - margin.left - margin.right);
  const innerHeight = Math.max(0, height - margin.top - margin.bottom);

  const orderedSeries = EXAM_TYPE_ORDER.map((type) => {
    const s = series.find((item) => item.examType === type);
    return {
      examType: type,
      label: s?.label ?? LABEL_BY_TYPE[type],
      points: (s?.points ?? []).map((p) => ({ ...p, date: String(p.date ?? "").slice(0, 10) })),
    };
  }).filter((s) => s.points.length > 0);

  const allDates = orderedSeries.flatMap((s) => s.points.map((p) => p.date));
  const uniqueDates = Array.from(new Set(allDates)).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );

  const isEmpty = orderedSeries.length === 0 || uniqueDates.length === 0;

  const yMin = 0;
  const yMax = 75;

  const xScale = (index: number) =>
    uniqueDates.length <= 1 ? innerWidth / 2 : (index / (uniqueDates.length - 1)) * innerWidth;

  const yScale = (score: number) => innerHeight - ((score - yMin) / (yMax - yMin)) * innerHeight;

  const passY = yScale(passScore);
  const yTicks = [0, 25, 50, 75];
  const xTickIndices = [0, Math.floor((uniqueDates.length - 1) / 2), uniqueDates.length - 1].filter(
    (i) => i >= 0 && i < uniqueDates.length,
  );

  return (
    <div className={cn("relative w-full", className)} style={{ minHeight: height }}>
      {isEmpty ? (
        <div className="flex h-full min-h-[120px] flex-col items-center justify-center text-center">
          <svg
            className="mb-2 h-8 w-8 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605"
            />
          </svg>
          <p className="text-sm text-muted-foreground">暂无成绩趋势数据</p>
          <p className="text-xs text-muted-foreground">完成模拟考试后将在此展示趋势</p>
        </div>
      ) : (
        <svg
          role="img"
          aria-label="成绩趋势图"
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className="overflow-visible"
        >
          <g transform={`translate(${margin.left},${margin.top})`}>
            {/* Y-axis grid lines and ticks */}
            {yTicks.map((tick) => (
              <g key={`y-${tick}`}>
                <line
                  x1={0}
                  x2={innerWidth}
                  y1={yScale(tick)}
                  y2={yScale(tick)}
                  className="stroke-border"
                  strokeWidth={1}
                  strokeDasharray={tick === 0 ? undefined : "4 4"}
                  opacity={tick === 0 ? 1 : 0.6}
                />
                <text
                  x={-8}
                  y={yScale(tick)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-muted-foreground"
                  style={{ fontSize: 10 }}
                >
                  {tick}
                </text>
              </g>
            ))}

            {/* Pass score dashed line */}
            <line
              x1={0}
              x2={innerWidth}
              y1={passY}
              y2={passY}
              className="stroke-destructive"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              opacity={0.8}
            />
            <text
              x={innerWidth + 4}
              y={passY}
              dy="0.32em"
              className="fill-destructive"
              style={{ fontSize: 9 }}
            >
              {passScore}分
            </text>

            {/* X-axis ticks */}
            {xTickIndices.map((index) => (
              <text
                key={`x-${index}`}
                x={xScale(index)}
                y={innerHeight + 16}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: 10 }}
              >
                {formatDate(uniqueDates[index])}
              </text>
            ))}

            {/* Trend lines and points */}
            {orderedSeries.map((s) => {
              const color = COLOR_BY_TYPE[s.examType];
              const d = s.points
                .map((point, idx) => {
                  const dateIndex = uniqueDates.indexOf(point.date);
                  const x = xScale(dateIndex);
                  const y = yScale(point.score);
                  return `${idx === 0 ? "M" : "L"}${x},${y}`;
                })
                .join(" ");

              return (
                <g key={s.examType}>
                  <path
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {s.points.map((point, idx) => {
                    const dateIndex = uniqueDates.indexOf(point.date);
                    const x = xScale(dateIndex);
                    const y = yScale(point.score);
                    return (
                      <circle
                        key={`${s.examType}-${idx}`}
                        cx={x}
                        cy={y}
                        r={3.5}
                        fill="hsl(var(--background))"
                        stroke={color}
                        strokeWidth={2}
                      />
                    );
                  })}
                </g>
              );
            })}
          </g>
        </svg>
      )}

      {/* Legend */}
      {!isEmpty && (
        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex flex-wrap items-center gap-3">
            {orderedSeries.map((s) => (
              <div key={s.examType} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-4 rounded-full"
                  style={{ backgroundColor: COLOR_BY_TYPE[s.examType] }}
                />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="inline-block h-0 w-4 rounded-full"
              style={{
                borderTop: "2px dashed hsl(var(--destructive))",
              }}
            />
            <span className="text-xs text-muted-foreground">及格线</span>
          </div>
        </div>
      )}
    </div>
  );
}
