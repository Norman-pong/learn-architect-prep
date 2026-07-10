import type { SVGProps, ReactElement } from "react";
import {
  Home01Icon,
  Book01Icon,
  BookOpen02Icon,
  QuestionIcon,
  Search01Icon,
  Edit01Icon,
  CancelCircleIcon,
  BarChartIcon,
  Alert01Icon,
  AlertCircleIcon,
  ComputerIcon,
  File01Icon,
  Logout01Icon,
  Menu01Icon,
  MoonIcon,
  Sun01Icon,
  Settings01Icon,
  Copy01Icon,
  ChartLineIcon,
  BulbIcon,
  CloudUploadIcon,
  Download01Icon,
  Upload01Icon,
  CircleCheckIcon,
  CheckmarkCircle01Icon,
  RedoIcon,
  Award01Icon,
  Navigation01Icon,
  CloudDownloadIcon,
  EyeIcon,
  FilterIcon,
  Robot01Icon,
  SaveIcon,
  GridIcon,
  Delete01Icon,
  PencilIcon,
  Add01Icon,
  CloudSyncIcon,
  Mail01Icon,
  LockPasswordIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Rotate01Icon,
  Flag01Icon,
  HashIcon,
  Database01Icon,
  Target01Icon,
  TrendingUpDownIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";

export type IconSvgObject = readonly (
  | readonly [string, Record<string, string | number>]
  | [string, Record<string, string | number>]
)[];

export interface HugeiconProps extends Omit<
  SVGProps<SVGSVGElement>,
  "width" | "height" | "viewBox" | "xmlns" | "fill"
> {
  iconData: IconSvgObject;
  size?: number | string;
  strokeWidth?: number | string;
}

export function Hugeicon({
  iconData,
  size = 24,
  strokeWidth,
  className,
  style,
  ...rest
}: HugeiconProps): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      strokeWidth={strokeWidth}
      className={className}
      style={style}
      {...rest}
    >
      {iconData.map(([tagName, attrs], index) => {
        const key = typeof attrs.key === "string" ? attrs.key : index;
        const { key: _k, ...props } = attrs;
        void _k;
        const Tag = tagName as keyof React.JSX.IntrinsicElements;
        return <Tag key={key} {...props} />;
      })}
    </svg>
  );
}

function createIcon(iconData: IconSvgObject) {
  return function Icon(props: Omit<HugeiconProps, "iconData">): ReactElement {
    return <Hugeicon iconData={iconData} {...props} />;
  };
}

export const iconMap = {
  Home: Home01Icon,
  Book: Book01Icon,
  Question: QuestionIcon,
  Search: Search01Icon,
  Edit: Edit01Icon,
  CloseCircle: CancelCircleIcon,
  BarChart: BarChartIcon,
  Warning: Alert01Icon,
  Desktop: ComputerIcon,
  FileText: File01Icon,
  Logout: Logout01Icon,
  Menu: Menu01Icon,
  Moon: MoonIcon,
  Sun: Sun01Icon,
  Settings: Settings01Icon,
  Snippets: Copy01Icon,
  LineChart: ChartLineIcon,
  Bulb: BulbIcon,
  CloudUpload: CloudUploadIcon,
  Download: Download01Icon,
  Upload: Upload01Icon,
  CheckCircle: CircleCheckIcon,
  Redo: RedoIcon,
  Trophy: Award01Icon,
  Send: Navigation01Icon,
  CloudDownload: CloudDownloadIcon,
  Eye: EyeIcon,
  Filter: FilterIcon,
  Robot: Robot01Icon,
  Save: SaveIcon,
  Project: GridIcon,
  Delete: Delete01Icon,
  Highlight: PencilIcon,
  Plus: Add01Icon,
  CloudSync: CloudSyncIcon,
  Mail: Mail01Icon,
  Lock: LockPasswordIcon,
  Flag: Flag01Icon,
} as const;

export type IconName = keyof typeof iconMap;

export const HomeOutlined = createIcon(Home01Icon);
export const BookOutlined = createIcon(Book01Icon);
export const QuestionCircleOutlined = createIcon(QuestionIcon);
export const SearchOutlined = createIcon(Search01Icon);
export const EditOutlined = createIcon(Edit01Icon);
export const CloseCircleOutlined = createIcon(CancelCircleIcon);
export const BarChartOutlined = createIcon(BarChartIcon);
export const WarningOutlined = createIcon(Alert01Icon);
export const DesktopOutlined = createIcon(ComputerIcon);
export const FileTextOutlined = createIcon(File01Icon);
export const LogoutOutlined = createIcon(Logout01Icon);
export const MenuFoldOutlined = createIcon(Menu01Icon);
export const MenuUnfoldOutlined = createIcon(Menu01Icon);
export const MoonOutlined = createIcon(MoonIcon);
export const SunOutlined = createIcon(Sun01Icon);
export const SettingOutlined = createIcon(Settings01Icon);
export const SnippetsOutlined = createIcon(Copy01Icon);
export const LineChartOutlined = createIcon(ChartLineIcon);
export const BulbOutlined = createIcon(BulbIcon);
export const CloudUploadOutlined = createIcon(CloudUploadIcon);
export const DownloadOutlined = createIcon(Download01Icon);
export const UploadOutlined = createIcon(Upload01Icon);
export const CheckCircleOutlined = createIcon(CircleCheckIcon);
export const RedoOutlined = createIcon(RedoIcon);
export const TrophyOutlined = createIcon(Award01Icon);
export const SendOutlined = createIcon(Navigation01Icon);
export const CloudDownloadOutlined = createIcon(CloudDownloadIcon);
export const EyeOutlined = createIcon(EyeIcon);
export const FilterOutlined = createIcon(FilterIcon);
export const RobotOutlined = createIcon(Robot01Icon);
export const SaveOutlined = createIcon(SaveIcon);
export const ProjectOutlined = createIcon(GridIcon);
export const DeleteOutlined = createIcon(Delete01Icon);
export const HighlightOutlined = createIcon(PencilIcon);
export const PlusOutlined = createIcon(Add01Icon);
export const CloudSyncOutlined = createIcon(CloudSyncIcon);
export const MailOutlined = createIcon(Mail01Icon);
export const LockOutlined = createIcon(LockPasswordIcon);
export const ChevronLeftOutlined = createIcon(ChevronLeftIcon);
export const ChevronRightOutlined = createIcon(ChevronRightIcon);
export const ArrowLeftOutlined = createIcon(ArrowLeft01Icon);
export const ArrowRightOutlined = createIcon(ArrowRight01Icon);
export const CheckCircle2Outlined = createIcon(CheckmarkCircle01Icon);
export const XCircleOutlined = createIcon(Cancel01Icon);
export const FlagOutlined = createIcon(Flag01Icon);
export const RotateCcwOutlined = createIcon(Rotate01Icon);
export const HashOutlined = createIcon(HashIcon);
export const DatabaseOutlined = createIcon(Database01Icon);
export const TargetOutlined = createIcon(Target01Icon);
export const TrendingDownOutlined = createIcon(TrendingUpDownIcon);
export const AlertCircleOutlined = createIcon(AlertCircleIcon);
export const BookOpenOutlined = createIcon(BookOpen02Icon);
/* Aliases used by sibling features */
export const FileText = FileTextOutlined;
export const Plus = PlusOutlined;
export const Bot = RobotOutlined;
export const Save = SaveOutlined;
export const Download = DownloadOutlined;
export const Loader2 = RotateCcwOutlined;
export const CheckCircle2 = CheckCircle2Outlined;
export const AlertCircle = AlertCircleOutlined;
export const BarChart = BarChartOutlined;
export const BookOpen = BookOpenOutlined;
export const Lightbulb = BulbOutlined;
export const FolderKanban = ProjectOutlined;
export const Eye = EyeOutlined;
export const Filter = FilterOutlined;
export const Search = SearchOutlined;
