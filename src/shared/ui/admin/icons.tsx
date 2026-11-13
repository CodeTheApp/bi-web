"use client";

import type { CSSProperties } from "react";
import {
  House,
  Type,
  Folder,
  Image,
  Quote,
  Inbox,
  Settings,
  Plus,
  Eye,
  GripVertical,
  Trash2,
  Send,
  Paperclip,
  Check,
  X,
  ExternalLink,
  Upload,
  ChevronLeft,
  Phone,
  Pencil,
  Clock,
  Search,
  Menu,
  LogOut,
  Tag,
  Package,
  Boxes,
  EyeOff,
  Star,
  Play,
  Video,
  Receipt,
  Users,
  Truck,
  ChartNoAxesCombined,
} from "@/shared/ui/icons/lucide";
import "./AdminIcons.css";

// Legacy admin names remain stable; all leaves now use the same SVG-only catalogue.
const ICONS = {
  home: House,
  pages: Type,
  folder: Folder,
  image: Image,
  quote: Quote,
  mail: Inbox,
  cog: Settings,
  plus: Plus,
  eye: Eye,
  grip: GripVertical,
  trash: Trash2,
  send: Send,
  clip: Paperclip,
  check: Check,
  x: X,
  ext: ExternalLink,
  upload: Upload,
  back: ChevronLeft,
  phone: Phone,
  pen: Pencil,
  clock: Clock,
  search: Search,
  menu: Menu,
  logout: LogOut,
  tag: Tag,
  box: Package,
  stock: Boxes,
  products: Package,
  analytics: ChartNoAxesCombined,
  upload2: Upload,
  eyeOff: EyeOff,
  star: Star,
  play: Play,
  video: Video,
  receipt: Receipt,
  users: Users,
  truck: Truck,
} as const;
export type IconName = keyof typeof ICONS;
export function Icon({
  name,
  size = 16,
  className,
  style,
}: {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const Component = ICONS[name];
  return (
    <Component
      size={size}
      strokeWidth={1.7}
      className={`ic${className ? ` ${className}` : ""}`}
      data-icon={name}
      aria-hidden="true"
      style={{ width: size, height: size, ...style }}
    />
  );
}
