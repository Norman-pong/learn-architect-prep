import type { SVGProps, ReactElement } from "react";
import { iconMap, type IconName, Hugeicon } from "./icons";

export type { IconName } from "./icons";
export { Hugeicon } from "./icons";

export interface IconProps extends Omit<
  SVGProps<SVGSVGElement>,
  "width" | "height" | "viewBox" | "xmlns" | "fill"
> {
  name: IconName;
  size?: number | string;
  strokeWidth?: number | string;
}

export function Icon({
  name,
  size = 24,
  strokeWidth,
  className,
  style,
  ...rest
}: IconProps): ReactElement | null {
  const data = iconMap[name];
  if (!data) return null;
  return (
    <Hugeicon
      iconData={data}
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      style={style}
      {...rest}
    />
  );
}
