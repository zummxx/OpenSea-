export interface ModeInfo {
  id: 'single' | 'self_funded' | 'sponsored';
  title: string;
  subtitle: string;
  maxWallets: number;
  payerDescription: string;
  gasSponsor: string;
  nftDestination: string;
  failureBoundary: string;
  keyConfig: string[];
  features: string[];
  workflow: string[];
}

export interface TimelineStep {
  timeLabel: string;
  title: string;
  description: string;
  details: string[];
  badgeColor: string;
}

export interface CommandInfo {
  name: string;
  category: 'core' | 'management' | 'utility' | 'sponsored';
  description: string;
  syntax: string;
  broadcasts: boolean;
  applicableMode: string;
  parameters: {
    name: string;
    description: string;
    required: boolean;
    defaultValue?: string;
  }[];
  example: string;
}

export interface ConfigOption {
  key: string;
  defaultValue: string;
  required: boolean;
  category: 'network' | 'mode' | 'fees' | 'timeouts' | 'sponsored';
  purpose: string;
  validRange?: string;
}

export interface SecurityRisk {
  level: 'critical' | 'high' | 'medium';
  title: string;
  description: string;
  recommendation: string;
}
