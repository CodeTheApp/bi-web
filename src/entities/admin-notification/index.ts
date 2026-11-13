export type AdminNotificationKind = "customer" | "order" | "message";
export type AdminNotification = {
  id: string;
  kind: AdminNotificationKind;
  title: string;
  description: string;
  href: string;
  createdAt: string;
  read: boolean;
};
export type AdminNotificationFeed = {
  scope: string;
  observedAt: string;
  items: AdminNotification[];
};
