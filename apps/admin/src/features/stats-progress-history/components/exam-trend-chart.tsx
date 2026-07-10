import type { ExamType } from "../types";

interface TrendPoint {
  date: string;
  score: number;
  passed: boolean;
}

interface TrendSeries {
  examType: ExamType;
  label: string;
  points: TrendPoint[];
}

interface ExamTrendChartProps {
  series: TrendSeries[];
  passScore: number;
}

const SERIES_COLORS: Record<ExamType, string> = {
  comprehensive: "hsl(var(--primary))",
  case: "hsl(var(--secondary))",
  essay: "hsl(var(--accent))",
};

export function ExamTrendChart({ series, passScore }: ExamTrendChartProps) {
  const width = 720;
  const height = 240;
  const padding = { top: 24, right: 24, bottom: 36, left: 44 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const allPoints = series.flatMap((s) => s.points);
  const maxY = Math.max(75, passScore, ...allPoints.map((p) => p.score));

  const totalDays = series[0]?.points.length ?? 0;
  const xTick = (i: number) =>
    padding.left + (totalDays <= 1 ? innerWidth / 2 : (i / (totalDays - 1)) * innerWidth);
  const yScale = (score: number) => padding.top + innerHeight - (score / maxY) * innerHeight;
  const passY = yScale(passScore);

  const yTicks = [0, 25, 50, 75].filter((v) => v <= maxY + 5);

  function buildPath(points: TrendPoint[]): string {
    if (points.length === 0) return "";
    const segments: string[] = [];
    let current: string[] = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.score > 0) {
        const x = xTick(i);
        const y = yScale(p.score);
        current.push(current.length === 0 ? `M ${x} ${y}` : `L ${x} ${y}`);
      } else if (current.length > 0) {
        segments.push(current.join(" "));
        current = [];
      }
    }
    if (current.length > 0) segments.push(current.join(" "));
    return segments.join(" ");
  }

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-[720px]"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Y-axis grid */}
        {yTicks.map((t) => {
          const y = yScale(t);
          return (
            <g key={t}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + innerWidth}
                y2={y}
                className="stroke-border"
                strokeDasharray="2 2"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                className="fill-muted-foreground text-[10px]"
                textAnchor="end"
              >
                {t}
              </text>
            </g>
          );
        })}

        {/* Pass score line */}
        <line
          x1={padding.left}
          y1={passY}
          x2={padding.left + innerWidth}
          y2={passY}
          className="stroke-destructive"
          strokeDasharray="4 4"
        />
        <text
          x={padding.left + innerWidth}
          y={passY - 6}
          className="fill-destructive text-[10px]"
          textAnchor="end"
        >
          合格线 {passScore}
        </text>

        {/* X-axis date ticks */}
        {totalDays > 0 &&
          [0, Math.floor(totalDays / 2), totalDays - 1].map((i) => {
            const point = series[0]?.points[i];
            if (!point) return null;
            const x = xTick(i);
            return (
              <text
                key={i}
                x={x}
                y={padding.top + innerHeight + 16}
                className="fill-muted-foreground text-[10px]"
                textAnchor="middle"
              >
                {String(point.date ?? "").slice(5)}
              </text>
            );
          })}

        {/* Lines */}
        {series.map((s) => (
          <g key={s.examType}>
            <path
              d={buildPath(s.points)}
              fill="none"
              stroke={SERIES_COLORS[s.examType]}
              strokeWidth={2}
            />
            {s.points
              .filter((p) => p.score > 0)
              .map((p, i) => {
                const x = xTick(i);
                const y = yScale(p.score);
                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r={3}
                    fill={SERIES_COLORS[s.examType]}
                    stroke="hsl(var(--background))"
                    strokeWidth={1}
                  />
                );
              })}
          </g>
        ))}

        {/* Legend */}
        <g transform={`translate(${padding.left}, ${height - 12})`}>
          {series.map((s, i) => (
            <g key={s.examType} transform={`translate(${i * 100}, 0)`}>
              <rect width={10} height={10} fill={SERIES_COLORS[s.examType]} rx={2} />
              <text x={14} y={9} className="fill-muted-foreground text-[10px]">
                {s.label}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
