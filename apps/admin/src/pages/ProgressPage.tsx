import { useEffect, useMemo, useState } from "react";
import {
  Card,
  Empty,
  List,
  Progress,
  Segmented,
  Select,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
  theme as antdTheme,
} from "antd";
import { apiRequest } from "../api/client";
import { useThemeMode } from "../store/theme";
import { usePrefersDark } from "../hooks/usePrefersDark";

function useResolvedDark(): boolean {
  const [mode] = useThemeMode();
  const prefersDark = usePrefersDark();
  const resolved: "light" | "dark" = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
  return resolved === "dark";
}

const { Title, Text, Paragraph } = Typography;

interface HeatmapDay {
  date: string;
  count: number;
  duration: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface HeatmapData {
  year: number;
  days: HeatmapDay[];
  totalActiveDays: number;
  totalCount: number;
  totalDuration: number;
}

interface CalendarSession {
  sessionId: string;
  chapterId: string | null;
  duration: number;
}

interface CalendarDay {
  date: string;
  count: number;
  duration: number;
  sessions: CalendarSession[];
}

interface CalendarData {
  month: string;
  days: CalendarDay[];
}

interface ChapterProgress {
  chapterId: string;
  chapterTitle: string;
  section: string;
  totalKnowledgePoints: number;
  studiedKnowledgePoints: number;
  completionRate: number;
  totalReviews: number;
  averageEase: number;
  masteryRate: number;
  examWeight: number;
}

interface MonthPickerProps {
  value: string; // YYYY-MM
  onChange: (next: string) => void;
}

function MonthPicker({ value, onChange }: MonthPickerProps) {
  const [y, m] = value.split("-").map(Number);
  const yearOptions = useMemo(() => {
    const start = 2020;
    const end = new Date().getFullYear() + 1;
    const opts: Array<{ label: string; value: number }> = [];
    for (let yr = end; yr >= start; yr--) opts.push({ label: `${yr} 年`, value: yr });
    return opts;
  }, []);
  const monthOptions = MONTH_LABELS.map((label, i) => ({
    label,
    value: String(i + 1).padStart(2, "0"),
  }));
  return (
    <Space.Compact>
      <Select
        size="small"
        value={y}
        onChange={(newYear) => onChange(`${newYear}-${String(m).padStart(2, "0")}`)}
        options={yearOptions}
        style={{ width: 90 }}
      />
      <Select
        size="small"
        value={String(m).padStart(2, "0")}
        onChange={(newMonth) => onChange(`${y}-${newMonth}`)}
        options={monthOptions}
        style={{ width: 80 }}
      />
    </Space.Compact>
  );
}

const WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const MONTH_LABELS = [
  "1月",
  "2月",
  "3月",
  "4月",
  "5月",
  "6月",
  "7月",
  "8月",
  "9月",
  "10月",
  "11月",
  "12月",
];

// GitHub-style palette: light mode
const HEAT_LEVEL_BG_LIGHT = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
// Dark mode palette (brighter, lower-eye-strain)
const HEAT_LEVEL_BG_DARK = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];

function masteryColor(rate: number): "success" | "warning" | "error" | "default" {
  if (rate >= 75) return "success";
  if (rate >= 40) return "warning";
  if (rate > 0) return "error";
  return "default";
}

function examWeightColor(weight: number): "red" | "orange" | "gold" | "default" {
  if (weight >= 5) return "red";
  if (weight >= 4) return "orange";
  if (weight >= 3) return "gold";
  return "default";
}

/**
 * Heatmap grid for an entire year, GitHub style.
 *
 * Layout:
 *   - 7 rows (Sun..Sat) × N columns (weeks).
 *   - First column may have empty cells before Jan 1 falls on a weekday.
 *   - We render 53 columns × 7 rows = 371 cells; trailing empties are valid.
 */
function buildHeatmapGrid(days: HeatmapDay[], year: number): Array<HeatmapDay | null>[] {
  const firstDate = new Date(year, 0, 1);
  const startWeekday = firstDate.getDay(); // 0..6
  const cells: Array<HeatmapDay | null> = Array.from<HeatmapDay | null>({
    length: startWeekday,
  }).fill(null);
  for (const d of days) cells.push(d);

  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: Array<HeatmapDay | null>[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function monthLabelsForYear(year: number): Array<{ col: number; label: string }> {
  // For each month, find the week column where its 1st falls.
  const result: Array<{ col: number; label: string }> = [];
  let lastMonth = -1;
  const firstDate = new Date(year, 0, 1);
  const firstWeekday = firstDate.getDay();
  for (let m = 0; m < 12; m++) {
    const monthStart = new Date(year, m, 1);
    const offsetDays = Math.floor(
      (monthStart.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const col = Math.floor((firstWeekday + offsetDays) / 7);
    if (m === 0 || col > result[result.length - 1].col + 1) {
      result.push({ col, label: MONTH_LABELS[m] });
      lastMonth = m;
    } else if (m - lastMonth >= 1) {
      // skip — too cramped
    }
  }
  return result;
}

interface HeatmapGridProps {
  data: HeatmapData;
  selectedDate: string | null;
  onSelect: (date: string) => void;
}

function HeatmapGrid({ data, selectedDate, onSelect }: HeatmapGridProps) {
  const { token } = antdTheme.useToken();
  const isDark = useResolvedDark();
  const palette = isDark ? HEAT_LEVEL_BG_DARK : HEAT_LEVEL_BG_LIGHT;
  const weeks = useMemo(() => buildHeatmapGrid(data.days, data.year), [data]);
  const monthMarks = useMemo(() => monthLabelsForYear(data.year), [data.year]);

  const cellSize = 12;
  const cellGap = 2;

  return (
    <div style={{ overflowX: "auto" }}>
      <div
        style={{
          display: "inline-grid",
          gridTemplateColumns: `auto repeat(${weeks.length}, ${cellSize}px)`,
          gridAutoRows: `${cellSize}px`,
          gap: cellGap,
          padding: 8,
          background: token.colorBgContainer,
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        {/* Month labels row */}
        <div />
        {weeks.map((_, colIdx) => {
          const mark = monthMarks.find((m) => m.col === colIdx);
          return (
            <div
              key={`m-${colIdx}`}
              style={{
                gridRow: 1,
                gridColumn: colIdx + 2,
                fontSize: 10,
                color: token.colorTextSecondary,
                lineHeight: `${cellSize}px`,
              }}
            >
              {mark ? mark.label : ""}
            </div>
          );
        })}
        {/* Weekday labels */}
        {WEEKDAY_LABELS.map((wd, rowIdx) => (
          <div
            key={`wd-${rowIdx}`}
            style={{
              gridRow: rowIdx + 2,
              gridColumn: 1,
              fontSize: 10,
              color: token.colorTextSecondary,
              paddingRight: 6,
              textAlign: "right",
              lineHeight: `${cellSize}px`,
              visibility: rowIdx % 2 === 1 ? "visible" : "hidden",
            }}
          >
            {wd}
          </div>
        ))}
        {/* Day cells */}
        {weeks.flatMap((week, colIdx) =>
          week.map((day, rowIdx) => {
            if (!day) {
              return (
                <div
                  key={`empty-${colIdx}-${rowIdx}`}
                  style={{
                    gridRow: rowIdx + 2,
                    gridColumn: colIdx + 2,
                    width: cellSize,
                    height: cellSize,
                  }}
                />
              );
            }
            const isSelected = day.date === selectedDate;
            return (
              <button
                key={day.date}
                type="button"
                aria-label={`${day.date} 学习 ${day.count} 次 ${day.duration} 分钟`}
                onClick={() => onSelect(day.date)}
                title={`${day.date} · ${day.count} 次 · ${day.duration} 分钟`}
                style={{
                  gridRow: rowIdx + 2,
                  gridColumn: colIdx + 2,
                  width: cellSize,
                  height: cellSize,
                  background: palette[day.level],
                  border: isSelected
                    ? `2px solid ${token.colorPrimary}`
                    : `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: 2,
                  cursor: "pointer",
                  padding: 0,
                  outline: "none",
                  transition: "transform 120ms ease-out",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              />
            );
          }),
        )}
      </div>
    </div>
  );
}

function legendItems(palette: string[]) {
  return (
    <Space size={4} align="center">
      <Text type="secondary" style={{ fontSize: 11 }}>
        少
      </Text>
      {palette.map((color, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            background: color,
            borderRadius: 2,
            border: "1px solid rgba(0,0,0,0.1)",
          }}
        />
      ))}
      <Text type="secondary" style={{ fontSize: 11 }}>
        多
      </Text>
    </Space>
  );
}

interface MonthlyCalendarProps {
  data: CalendarData;
  selectedDate: string | null;
  onSelect: (date: string) => void;
}

function MonthlyCalendar({ data, selectedDate, onSelect }: MonthlyCalendarProps) {
  const { token } = antdTheme.useToken();
  const isDark = useResolvedDark();
  if (!data.days.length) {
    return <Empty description="暂无数据" />;
  }
  const firstDay = new Date(data.days[0].date + "T00:00:00");
  const firstWeekday = firstDay.getDay();
  const cells: Array<CalendarDay | null> = Array.from<CalendarDay | null>({
    length: firstWeekday,
  }).fill(null);
  cells.push(...data.days);

  const palette = isDark ? HEAT_LEVEL_BG_DARK : HEAT_LEVEL_BG_LIGHT;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: 6,
        padding: 8,
      }}
    >
      {WEEKDAY_LABELS.map((wd) => (
        <div
          key={wd}
          style={{
            textAlign: "center",
            fontSize: 12,
            color: token.colorTextSecondary,
            fontWeight: 500,
          }}
        >
          {wd}
        </div>
      ))}
      {cells.map((day, i) => {
        if (!day) {
          return <div key={`empty-${i}`} />;
        }
        const isSelected = day.date === selectedDate;
        const hasData = day.count > 0 || day.duration > 0;
        const dayNum = Number(day.date.slice(8, 10));
        return (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelect(day.date)}
            style={{
              position: "relative",
              minHeight: 56,
              padding: 6,
              border: isSelected
                ? `2px solid ${token.colorPrimary}`
                : `1px solid ${token.colorBorderSecondary}`,
              borderRadius: token.borderRadiusSM,
              background: hasData
                ? palette[Math.min(4, Math.max(1, Math.ceil(day.duration / 15) + 1))]
                : token.colorBgContainer,
              cursor: "pointer",
              textAlign: "left",
              color: hasData ? "#fff" : token.colorText,
              fontWeight: isSelected ? 600 : 400,
            }}
          >
            <div style={{ fontSize: 13 }}>{dayNum}</div>
            {hasData && (
              <div style={{ fontSize: 10, opacity: 0.9, marginTop: 2 }}>
                {day.count}次 · {day.duration}m
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function DayDetailPanel({ date }: { date: string }) {
  const [month, setMonth] = useState<string>(() => date.slice(0, 7));
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiRequest<CalendarData>(`/api/progress/calendar?month=${month}`)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  const day = data?.days.find((d) => d.date === date) ?? null;

  return (
    <Card
      title={`${date} 学习详情`}
      size="small"
      extra={<MonthPicker value={month} onChange={setMonth} />}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 3 }} />
      ) : !day ? (
        <Empty description="未查询到该日数据" />
      ) : (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space size="large" wrap>
            <Statistic title="动作次数" value={day.count} suffix="次" />
            <Statistic title="学习时长" value={day.duration} suffix="分钟" />
          </Space>
          <div>
            <Text strong>学习会话</Text>
            {day.sessions.length === 0 ? (
              <Paragraph type="secondary" style={{ marginTop: 8 }}>
                当日没有学习会话记录。
              </Paragraph>
            ) : (
              <List
                size="small"
                style={{ marginTop: 8 }}
                dataSource={day.sessions}
                renderItem={(s) => (
                  <List.Item>
                    <Space>
                      <Tag color="blue">{s.duration} 分钟</Tag>
                      <Text>{s.chapterId ? `章节 ${s.chapterId}` : "未分类章节"}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </div>
        </Space>
      )}
    </Card>
  );
}

function ChapterProgressGrid({ chapters }: { chapters: ChapterProgress[] }) {
  const { token } = antdTheme.useToken();
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
        gap: token.padding,
      }}
    >
      {chapters.map((ch) => (
        <Card key={ch.chapterId} size="small" hoverable>
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Space size={4} wrap>
              <Tag color={examWeightColor(ch.examWeight)}>重点 {ch.examWeight}</Tag>
              <Tag>{ch.section}</Tag>
            </Space>
            <Text strong>{ch.chapterTitle}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {ch.studiedKnowledgePoints}/{ch.totalKnowledgePoints} 知识点
              {" · "}复习 {ch.totalReviews} 次
            </Text>
            <Progress
              percent={ch.completionRate}
              size="small"
              status={ch.completionRate >= 75 ? "success" : "active"}
              format={(p) => `完成 ${p?.toFixed(0)}%`}
            />
            <Progress
              percent={ch.masteryRate}
              size="small"
              strokeColor={
                ch.masteryRate >= 75
                  ? token.colorSuccess
                  : ch.masteryRate >= 40
                    ? token.colorWarning
                    : token.colorError
              }
              format={(p) => (
                <span>
                  <Tag color={masteryColor(ch.masteryRate)} style={{ margin: 0 }}>
                    掌握 {p?.toFixed(0)}%
                  </Tag>
                </span>
              )}
            />
          </Space>
        </Card>
      ))}
    </div>
  );
}

export default function ProgressPage() {
  const { token } = antdTheme.useToken();
  const today = new Date();
  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`,
  );

  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [calendar, setCalendar] = useState<CalendarData | null>(null);
  const [chapters, setChapters] = useState<ChapterProgress[] | null>(null);
  const [loadingHeatmap, setLoadingHeatmap] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // When year changes, default selected to first day of that year with activity (or today if same year)
  useEffect(() => {
    let cancelled = false;
    setLoadingHeatmap(true);
    apiRequest<HeatmapData>(`/api/progress/heatmap?year=${year}`)
      .then((res) => {
        if (!cancelled) setHeatmap(res);
      })
      .catch(() => {
        if (!cancelled) setHeatmap(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingHeatmap(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year]);

  useEffect(() => {
    let cancelled = false;
    setLoadingCalendar(true);
    apiRequest<CalendarData>(`/api/progress/calendar?month=${month}`)
      .then((res) => {
        if (!cancelled) setCalendar(res);
      })
      .catch(() => {
        if (!cancelled) setCalendar(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingCalendar(false);
      });
    return () => {
      cancelled = true;
    };
  }, [month]);

  useEffect(() => {
    let cancelled = false;
    setLoadingChapters(true);
    apiRequest<ChapterProgress[]>("/api/progress/chapters")
      .then((res) => {
        if (!cancelled) setChapters(res);
      })
      .catch(() => {
        if (!cancelled) setChapters(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingChapters(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const yearOptions = useMemo(() => {
    const list: number[] = [];
    for (let y = today.getFullYear(); y >= today.getFullYear() - 4; y--) list.push(y);
    return list.map((y) => ({ label: `${y} 年`, value: y }));
  }, [today]);

  const isDark = useResolvedDark();

  return (
    <div style={{ padding: token.padding }}>
      <Title level={3} style={{ marginBottom: token.marginMD }}>
        学习进度追踪
      </Title>

      {/* Heatmap */}
      <Card
        title="年度学习热力图"
        extra={<Segmented value={year} onChange={(v) => setYear(v)} options={yearOptions} />}
        style={{ marginBottom: token.marginMD }}
      >
        <Skeleton loading={loadingHeatmap} active paragraph={{ rows: 4 }}>
          {heatmap ? (
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Space size="large" wrap>
                <Statistic title="活跃天数" value={heatmap.totalActiveDays} suffix="天" />
                <Statistic title="动作总数" value={heatmap.totalCount} suffix="次" />
                <Statistic
                  title="学习时长"
                  value={Math.round(heatmap.totalDuration)}
                  suffix="分钟"
                />
              </Space>
              <HeatmapGrid
                data={heatmap}
                selectedDate={selectedDate}
                onSelect={(d) => setSelectedDate(d)}
              />
              <Space style={{ justifyContent: "flex-end", width: "100%" }}>
                {legendItems(isDark ? HEAT_LEVEL_BG_DARK : HEAT_LEVEL_BG_LIGHT)}
              </Space>
            </Space>
          ) : (
            <Empty description="暂无热力图数据" />
          )}
        </Skeleton>
      </Card>

      {/* Calendar + Day detail */}
      <Card
        title="月度学习日历"
        extra={<MonthPicker value={month} onChange={setMonth} />}
        style={{ marginBottom: token.marginMD }}
      >
        <Skeleton loading={loadingCalendar} active>
          {calendar ? (
            <MonthlyCalendar
              data={calendar}
              selectedDate={selectedDate}
              onSelect={(d) => setSelectedDate(d)}
            />
          ) : (
            <Empty description="暂无日历数据" />
          )}
        </Skeleton>
      </Card>

      {selectedDate && (
        <div style={{ marginBottom: token.marginMD }}>
          <DayDetailPanel date={selectedDate} />
        </div>
      )}

      {/* Chapter mastery */}
      <Card title="章节掌握度">
        <Skeleton loading={loadingChapters} active paragraph={{ rows: 6 }}>
          {chapters && chapters.length > 0 ? (
            <ChapterProgressGrid chapters={chapters} />
          ) : (
            <Empty description="暂无章节进度数据" />
          )}
        </Skeleton>
      </Card>
    </div>
  );
}
