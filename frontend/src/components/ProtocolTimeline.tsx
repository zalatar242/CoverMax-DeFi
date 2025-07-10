import React from 'react';
import {
  Typography,
  Box,
  Tooltip
} from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';

interface ProtocolPhase {
  name: string;
  start: Date;
  end?: Date;
}

interface ProtocolTimelineProps {
  status: string;
  phases: Record<string, ProtocolPhase>;
}

const ProtocolTimeline: React.FC<ProtocolTimelineProps> = ({ status, phases }) => {

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {Object.entries(phases).map(([key, phase]) => (
        <Tooltip
          key={key}
          title={
            phase.name === "Deposit Phase (2 days)" ?
              "2-day window to deposit USDC into the protocol. Your deposits are split into two tranches (AAA, AA) each with different risk/reward profiles." :
            phase.name === "Insurance Phase (5 days)" ?
              "5-day period where your deposits are protected and earning yield across Aave and Moonwell lending protocols." :
            phase.name === "Withdrawal Phase (3 days)" ?
              "3-day window to withdraw your funds. Withdrawals are processed in order of tranche priority: AAA (lowest risk) first, then AA (higher risk)." :
            ""
          }
          arrow
          placement="right"
        >
          <Box
            sx={{
              p: 2,
              borderRadius: 1,
              bgcolor: status === phase.name ? (theme) => `${theme.palette.primary.main}08` : 'transparent',
              border: '1px solid',
              borderColor: status === phase.name ?
                (theme) => `${theme.palette.primary.main}20` :
                'divider',
              cursor: 'help',
              transition: 'all 0.2s ease',
              '&:hover': {
                bgcolor: (theme) => `${theme.palette.primary.main}15`
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography
                variant="subtitle1"
                sx={{
                  color: status === phase.name ? 'primary.main' : 'text.primary',
                  fontWeight: status === phase.name ? 600 : 500
                }}
              >
                {phase.name}
              </Typography>
              <InfoOutlined sx={{ fontSize: 16, color: 'text.secondary' }} />
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              {phase.start.toLocaleDateString()} - {phase.end ? phase.end.toLocaleDateString() : 'End'}
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
};

export default ProtocolTimeline;
