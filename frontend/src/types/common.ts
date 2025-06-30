export interface TransactionOptions {
  from?: string;
  value?: string;
  gasLimit?: string;
  gasPrice?: string;
}

export interface TransactionResult {
  hash: string;
  wait: () => Promise<any>;
}

export interface TokenBalance {
  formatted: string;
  decimals: number;
  symbol: string;
  value: bigint;
}

export interface WalletState {
  address?: string;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
}

export interface SwapParams {
  amountIn: string;
  amountOutMin: string;
  path: string[];
  to: string;
  deadline: number;
}

export interface LiquidityParams {
  tokenA: string;
  tokenB: string;
  amountADesired: string;
  amountBDesired: string;
  amountAMin: string;
  amountBMin: string;
  to: string;
  deadline: number;
}

export interface ProtocolPhase {
  name: string;
  status: 'completed' | 'active' | 'upcoming';
  timestamp?: number;
  description?: string;
}

export interface SummaryBoxProps {
  title: string;
  value: string | number;
  description?: string;
  valueFormatter?: (value: any) => string;
  descriptionFormatter?: (description: any) => string;
}

export interface TokenOperationsCardProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  selectedToken: any;
  tokenData: any;
  tokenSymbol: string;
  actionButton?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: 'contained' | 'outlined';
    color?: 'primary' | 'secondary';
    icon?: React.ReactNode;
  };
  className?: string;
}

export interface ContentCardProps {
  children: React.ReactNode;
  title: string;
  icon?: React.ReactNode;
}

export interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

export interface RiskChartProps {
  aaaTokens: number;
  aaTokens: number;
}

export interface NavigationLinkProps {
  to: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}