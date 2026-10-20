import type * as React from 'react';

/** All monetary numbers in component props are integer minor units. */
export interface MoneySettings {
  symbol: string;
  position: 'left' | 'right' | 'left_space' | 'right_space';
  decimals: number;
  decimalSeparator: string;
  thousandSeparator: string;
}
export declare function MoneyProvider(props: { settings?: Partial<MoneySettings>; children?: React.ReactNode }): React.ReactElement;
export declare function useMoney(): (minorUnits: number) => string;

/* ---------- Foundations ---------- */
export type IconName =
  | 'box' | 'dashboard' | 'campaign' | 'analytics' | 'settings' | 'plus' | 'minus' | 'check' | 'close' | 'gift'
  | 'clock' | 'flame' | 'tag' | 'truck' | 'arrowUp' | 'arrowDown' | 'arrowRight' | 'arrowLeft' | 'chevronDown'
  | 'chevronUp' | 'chevronRight' | 'chevronLeft' | 'search' | 'trash' | 'copy' | 'eye' | 'edit' | 'grip' | 'more'
  | 'info' | 'alert' | 'lock' | 'sparkle' | 'external' | 'calendar' | 'filter' | 'image' | 'bolt' | 'users' | 'cart'
  | 'store' | 'palette' | 'mail' | 'key' | 'code' | 'percent' | 'refresh' | 'download' | 'layers' | 'help';
export interface IconProps extends React.SVGAttributes<SVGSVGElement> {
  name: IconName;
  /** px, default 20 */ size?: number;
  /** default 1.75 */ strokeWidth?: number;
  /** Give a title only when the icon stands alone and carries meaning. */ title?: string;
}
export declare function Icon(props: IconProps): React.ReactElement;

/* ---------- Actions ---------- */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = ink (default action); max = Max Orange hot CTA, one per view; default secondary */
  variant?: 'primary' | 'max' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
  /** Renders an <a> with the same look (WordPress admin URLs, prototype links). */ href?: string;
}
export declare function Button(props: ButtonProps): React.ReactElement;

export interface BadgeProps {
  tone?: 'neutral' | 'success' | 'warning' | 'critical' | 'info' | 'brand' | 'deal' | 'dark';
  /** Leading status dot (use for campaign status). */ dot?: boolean;
  icon?: IconName;
  children?: React.ReactNode;
  className?: string;
}
export declare function Badge(props: BadgeProps): React.ReactElement;

export interface StickerProps {
  tone?: 'pop' | 'max' | 'ink';
  size?: 'sm' | 'md' | 'lg';
  /** Rotates -4deg. */ tilt?: boolean;
  icon?: IconName;
  children?: React.ReactNode;
  className?: string;
}
export declare function Sticker(props: StickerProps): React.ReactElement;

/* ---------- Forms ---------- */
export interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: React.ReactNode;
  help?: React.ReactNode;
  /** Replaces help and marks the field invalid. */ error?: React.ReactNode;
  /** A string that names an icon renders that icon ("search", "calendar"); any other node renders as text. */
  prefix?: React.ReactNode | IconName;
  suffix?: React.ReactNode;
  multiline?: boolean;
  rows?: number;
}
export declare function TextField(props: TextFieldProps): React.ReactElement;

export interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  help?: React.ReactNode;
  options: Array<string | { value: string; label: string }>;
}
export declare function SelectField(props: SelectFieldProps): React.ReactElement;

export interface ToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  id?: string;
}
export declare function Toggle(props: ToggleProps): React.ReactElement;

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  indeterminate?: boolean;
  onChange?: (checked: boolean, event: React.ChangeEvent<HTMLInputElement>) => void;
}
export declare function Checkbox(props: CheckboxProps): React.ReactElement;

export interface ChoiceCardProps {
  selected?: boolean;
  onSelect?: (value: string) => void;
  name?: string;
  value?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned value such as a price. */ meta?: React.ReactNode;
  /** Pop sticker on the top edge ("Top seller"). */ tag?: React.ReactNode;
  icon?: IconName;
  disabled?: boolean;
  children?: React.ReactNode;
}
export declare function ChoiceCard(props: ChoiceCardProps): React.ReactElement;

export interface QuantityStepperProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  onChange?: (value: number) => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  /** Accessible group label, default "Quantity". */ label?: string;
}
export declare function QuantityStepper(props: QuantityStepperProps): React.ReactElement;

export type Option<V = string | number> = V | { value: V; label: React.ReactNode; icon?: IconName; count?: number };
export interface SegmentedControlProps<V = string | number> {
  options: Option<V>[];
  value?: V;
  defaultValue?: V;
  onChange?: (value: V) => void;
  size?: 'sm' | 'md';
  label?: string;
  fullWidth?: boolean;
}
export declare function SegmentedControl<V = string | number>(props: SegmentedControlProps<V>): React.ReactElement;

export interface ChipsProps<V = string | number> {
  options: Option<V>[];
  value?: V;
  defaultValue?: V;
  onChange?: (value: V) => void;
  label?: string;
}
export declare function Chips<V = string | number>(props: ChipsProps<V>): React.ReactElement;

/* ---------- Navigation & layout ---------- */
export interface TabsProps {
  tabs: Array<{ id: string; label: React.ReactNode; count?: number }>;
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  label?: string;
}
export declare function Tabs(props: TabsProps): React.ReactElement;

export interface StepsProps {
  /** Labels, or { label, href } to make a step a link. */ steps: Array<React.ReactNode | { label: React.ReactNode; href?: string }>;
  /** Zero-based index of the current step. */ current?: number;
  /** Makes steps clickable. */ onStep?: (index: number) => void;
  /** Shows only the current label (phones). */ compact?: boolean;
}
export declare function Steps(props: StepsProps): React.ReactElement;

export interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  /** none = edge-to-edge body for tables */ padding?: 'none' | 'sm' | 'md';
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  children?: React.ReactNode;
}
export declare function Card(props: CardProps): React.ReactElement;

export interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  backLabel?: React.ReactNode;
  onBack?: () => void;
  /** Makes the back control a link. */ backHref?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}
export declare function PageHeader(props: PageHeaderProps): React.ReactElement;

export interface NoticeProps {
  tone?: 'info' | 'success' | 'warning' | 'critical';
  title?: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  children?: React.ReactNode;
}
export declare function Notice(props: NoticeProps): React.ReactElement;

export interface EmptyStateProps {
  icon?: IconName;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}
export declare function EmptyState(props: EmptyStateProps): React.ReactElement;

export interface ToastProps {
  icon?: IconName;
  action?: React.ReactNode;
  onAction?: () => void;
  onDismiss?: () => void;
  children?: React.ReactNode;
}
export declare function Toast(props: ToastProps): React.ReactElement;

export interface ModalProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Shown in a tinted tile beside the heading. */ icon?: React.ReactNode;
  /** Use alertdialog for confirmations. Default dialog. */ role?: 'dialog' | 'alertdialog';
  /** Default md. */ size?: 'md' | 'lg';
  footer?: React.ReactNode;
  /** Escape, a click on the scrim and the close button call this. */ onClose?: () => void;
  /** Control (or a wrapper around one) that gets focus first; default is the first control. Use the safe action. */ initialFocusRef?: React.RefObject<HTMLElement>;
  /** Default true. */ showClose?: boolean;
  children?: React.ReactNode;
}
export declare function Modal(props: ModalProps): React.ReactElement;

export interface AdminNavItem { id: string; label: React.ReactNode; icon: IconName; count?: number; /** e.g. admin.php?page=mmbb-campaigns; default #/id */ href?: string }
export interface AdminShellProps {
  active?: string;
  onNavigate?: (id: string) => void;
  /** Default: Dashboard, Campaigns, Analytics, Settings. */ nav?: AdminNavItem[];
  /** Right side of the bar; default a Help button. */ right?: React.ReactNode;
  children?: React.ReactNode;
}
export declare function AdminShell(props: AdminShellProps): React.ReactElement;

/* ---------- Data ---------- */
export interface SparklineProps { data: number[]; width?: number; height?: number }
export declare function Sparkline(props: SparklineProps): React.ReactElement | null;

export interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Percent change, signed. */ delta?: number;
  deltaLabel?: React.ReactNode;
  /** Set false for costs (discount given, refunds). */ upIsGood?: boolean;
  /** ~12 points; the last segment is highlighted. */ trend?: number[];
  icon?: IconName;
}
export declare function StatCard(props: StatCardProps): React.ReactElement;

export interface DataTableColumn<R> {
  key: string;
  label: React.ReactNode;
  render?: (row: R) => React.ReactNode;
  /** Right-aligns, tabular figures. */ numeric?: boolean;
  width?: number | string;
}
export interface DataTableProps<R extends Record<string, any>> {
  columns: DataTableColumn<R>[];
  rows: R[];
  rowKey?: string;
  selectable?: boolean;
  selected?: Array<R[keyof R]>;
  defaultSelected?: Array<R[keyof R]>;
  onSelectionChange?: (keys: Array<R[keyof R]>) => void;
  onRowClick?: (row: R) => void;
  /** Accessible name of a row's checkbox, for example "Select Holiday Treat Box". */ rowLabel?: (row: R) => string;
  /** Shown in the bulk bar while rows are selected. */ bulkActions?: React.ReactNode;
  empty?: React.ReactNode;
  dense?: boolean;
}
export declare function DataTable<R extends Record<string, any>>(props: DataTableProps<R>): React.ReactElement;

export interface LineSeries {
  name: string;
  data: number[];
  /** A colour token: chart-1, chart-2, chart-3, chart-muted. */ color?: 'chart-1' | 'chart-2' | 'chart-3' | 'chart-muted';
  /** 10% wash under the line. */ area?: boolean;
  /** Direct-label the last value and show its end dot (one series only). */ label?: boolean;
}
export interface LineChartProps {
  series: LineSeries[];
  labels: string[];
  height?: number;
  formatValue?: (v: number) => React.ReactNode;
  formatTick?: (v: number) => string;
  yTicks?: number;
  ariaLabel?: string;
  /** Default: shown when there are 2+ series. */ legend?: boolean;
}
export declare function LineChart(props: LineChartProps): React.ReactElement;

export interface BarListProps {
  items: Array<{ label: string; value: number; meta?: React.ReactNode }>;
  formatValue?: (v: number) => React.ReactNode;
  color?: 'chart-1' | 'chart-2' | 'chart-3';
  max?: number;
}
export declare function BarList(props: BarListProps): React.ReactElement;

export interface FunnelChartProps {
  steps: Array<{ label: string; value: number; sub?: React.ReactNode }>;
  formatValue?: (v: number) => React.ReactNode;
}
export declare function FunnelChart(props: FunnelChartProps): React.ReactElement;

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: React.ReactNode;
  valueLabel?: React.ReactNode;
  tone?: 'ink' | 'max' | 'win';
  size?: 'md' | 'lg';
}
export declare function ProgressBar(props: ProgressBarProps): React.ReactElement;

/* ---------- Storefront ---------- */
export type ArtKind = 'cookie' | 'macaron' | 'candle' | 'soap' | 'tea' | 'donut' | 'chocolate' | 'honey';
export interface ProductArtProps { kind?: ArtKind; label?: string; className?: string }
export declare function ProductArt(props: ProductArtProps): React.ReactElement;

/** A product as the builder sees it. `image` wins over `art`. */
export interface BoxItem { id?: number | string; name?: string; image?: string | { src: string; srcset?: string; sizes?: string }; art?: ArtKind; price?: number }

export interface ProductTileProps {
  name: string;
  price: number;
  compareAt?: number;
  image?: string | { src: string; srcset?: string; sizes?: string };
  art?: ArtKind;
  badge?: React.ReactNode;
  /** deal renders a pop Sticker; any Badge tone renders a Badge. */ badgeTone?: 'deal' | BadgeProps['tone'];
  meta?: React.ReactNode;
  /** 1–5 shows "Only N left"; 0 = sold out. */ stock?: number;
  /** How many of this product are in the box. */ qty?: number;
  onAdd?: () => void;
  onChange?: (qty: number) => void;
  boxFull?: boolean;
  /** Deprecated: MoneyProvider settings determine the currency. */
  currency?: string;
}
export declare function ProductTile(props: ProductTileProps): React.ReactElement;

export interface BoxSlotsProps {
  size: number;
  items: BoxItem[];
  onRemove?: (index: number, item: BoxItem) => void;
  columns?: number;
}
export declare function BoxSlots(props: BoxSlotsProps): React.ReactElement;

export interface Tier { qty: number; label: string }
export interface TierProgressProps {
  count: number;
  tiers: Tier[];
  /** Track length in items; default the last tier's qty. */ size?: number;
  /** Message + track only (bars). */ compact?: boolean;
  /** For surface-strong grounds. */ inverse?: boolean;
}
export declare function TierProgress(props: TierProgressProps): React.ReactElement;

export interface BoxSize { qty: number; price?: number; save?: string; tag?: React.ReactNode; unit?: string; from?: boolean }
export interface BoxSizePickerProps {
  sizes: BoxSize[];
  value?: number;
  defaultValue?: number;
  onChange?: (qty: number) => void;
  /** pills for phones */ layout?: 'cards' | 'pills';
  /** Deprecated: MoneyProvider settings determine the currency. */
  currency?: string;
  name?: string;
}
export declare function BoxSizePicker(props: BoxSizePickerProps): React.ReactElement;

export interface BoxPanelProps {
  title?: React.ReactNode;
  size: number;
  items: BoxItem[];
  tiers?: Tier[];
  subtotal: number;
  total: number;
  /** Items needed before the CTA unlocks; default size. */ minItems?: number;
  onRemove?: (index: number, item: BoxItem) => void;
  onCheckout?: () => void;
  /** Makes the CTA a link (cart URL). */ ctaHref?: string;
  /** Disables the CTA even when the box is complete (editor preview). */ ctaDisabled?: boolean;
  /** Shows the CTA's busy state while the box is being added. */ ctaLoading?: boolean;
  ctaLabel?: React.ReactNode;
  footnote?: React.ReactNode;
  /** Deprecated: MoneyProvider settings determine the currency. */
  currency?: string;
  /** Rendered between tiers and totals: gift options, notes. */ children?: React.ReactNode;
}
export declare function BoxPanel(props: BoxPanelProps): React.ReactElement;

export interface BoxSummaryBarProps {
  size: number;
  items: BoxItem[];
  tiers?: Tier[];
  total: number;
  compareAt?: number | null;
  minItems?: number;
  onOpen?: () => void;
  /** Makes the summary a link (opens a drawer page). */ openHref?: string;
  onCheckout?: () => void;
  ctaHref?: string;
  ctaDisabled?: boolean;
  ctaLoading?: boolean;
  ctaLabel?: React.ReactNode;
  /** Deprecated: MoneyProvider settings determine the currency. */
  currency?: string;
}
export declare function BoxSummaryBar(props: BoxSummaryBarProps): React.ReactElement;

export interface CountdownProps {
  /** Seconds from mount. */ seconds?: number;
  /** ISO date; wins over seconds. */ endsAt?: string;
  label?: React.ReactNode;
  tone?: 'pop' | 'ink' | 'soft';
}
export declare function Countdown(props: CountdownProps): React.ReactElement;
