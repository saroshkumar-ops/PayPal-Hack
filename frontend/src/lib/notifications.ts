export type NotificationSetting = 'SPICY' | 'MILD' | 'NO_ROAST';

export interface NotificationOption {
  value: NotificationSetting;
  label: string;
  description: string;
}

export const NOTIFICATION_OPTIONS: NotificationOption[] = [
  {
    value: 'SPICY',
    label: 'Instant Alerts',
    description: 'Real-time payment reminders as debt ages past 24h',
  },
  {
    value: 'MILD',
    label: 'Daily Digest',
    description: 'One standard daily summary of outstanding balances',
  },
  {
    value: 'NO_ROAST',
    label: 'Muted',
    description: 'No automated reminders (manual settlement only)',
  },
];

export function getNotificationLabel(setting?: string): string {
  switch (setting) {
    case 'SPICY':
      return 'Instant Alerts';
    case 'MILD':
      return 'Daily Digest';
    case 'NO_ROAST':
      return 'Muted';
    default:
      return 'Daily Digest';
  }
}
