import React from 'react';
import { Box, Typography } from '@mui/material';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line, ReferenceLine } from 'recharts';
import { useTheme, useMediaQuery } from '@mui/material';
import { generateChartData, generateXAxisTicks } from '../../utils/riskCalculations';
import { formatUSDC } from '../../utils/analytics';
import CustomTooltip from './CustomTooltip';

interface RiskChartProps {
  aaaTokens: number;
  aaTokens: number;
}

const RiskChart: React.FC<RiskChartProps> = ({ aaaTokens, aaTokens }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const data = generateChartData(aaaTokens, aaTokens);
  const xAxisTicks = generateXAxisTicks();

  return (
    <Box>
      <Typography
        variant="subtitle1"
        sx={{
          mb: { xs: 2, sm: 3 },
          fontWeight: 600,
          color: 'text.primary'
        }}
      >
        Recovery Amount vs Exploit Severity
      </Typography>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: { xs: 2, md: 4 },
          mt: { xs: 1, sm: 2 }
        }}
      >
        <Box
          sx={{
            flex: { md: '1 1 70%' },
            height: { xs: 300, sm: 400 }
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{
                top: 20,
                right: isMobile ? 10 : 30,
                left: isMobile ? 40 : 60,
                bottom: isMobile ? 20 : 30
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis
                dataKey="x"
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`}
                ticks={xAxisTicks}
                domain={[0, 1]}
                label={{
                  value: 'Exploit Severity',
                  position: 'insideBottom',
                  offset: -10,
                  style: {
                    fontSize: isMobile ? '0.75rem' : '0.875rem'
                  }
                }}
                tick={{
                  fontSize: isMobile ? 10 : 12,
                  fill: theme.palette.text.secondary
                }}
                minTickGap={20}
              />
              <YAxis
                tickFormatter={formatUSDC}
                label={{
                  value: 'Recovery Amount (USDC)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: isMobile ? -10 : -20,
                  dy: isMobile ? 50 : 70,
                  style: {
                    fontSize: isMobile ? '0.75rem' : '0.875rem'
                  }
                }}
                tick={{
                  fontSize: isMobile ? 10 : 12,
                  fill: theme.palette.text.secondary
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                height={isMobile ? 48 : 36}
                wrapperStyle={{
                  fontSize: isMobile ? '0.75rem' : '0.875rem'
                }}
              />
              {/* Reference lines */}
              <ReferenceLine
                x={0.5}
                stroke={theme.palette.warning.main}
                strokeDasharray="3 3"
                label={{
                  value: '1 Protocol Exploited',
                  position: 'top',
                  fill: theme.palette.warning.main,
                  fontSize: isMobile ? '0.65rem' : '0.75rem'
                }}
              />
              <ReferenceLine
                x={1}
                stroke={theme.palette.error.main}
                strokeDasharray="3 3"
                label={{
                  value: '2 Protocols Exploited',
                  position: 'top',
                  fill: theme.palette.error.main,
                  fontSize: isMobile ? '0.65rem' : '0.75rem'
                }}
              />
              {/* Lines for each token type */}
              <Line
                type="monotone"
                dataKey="recovery"
                name="Total Recovery"
                stroke={theme.palette.primary.main}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
                animationDuration={750}
              />
              <Line
                type="monotone"
                dataKey="aaaRecovery"
                name="AAA Recovery"
                stroke={theme.palette.success.main}
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 4"
                animationDuration={750}
                animationBegin={250}
              />
              <Line
                type="monotone"
                dataKey="aaRecovery"
                name="AA Recovery"
                stroke={theme.palette.info.main}
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 4"
                animationDuration={750}
                animationBegin={500}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
        <Box
          sx={{
            flex: { md: '1 1 30%' },
            p: { xs: 2, sm: 3 }
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'text.secondary',
              mb: 2,
              fontSize: { xs: '0.75rem', sm: '0.875rem' }
            }}
          >
            This chart visualizes your potential recovery based on exploit severity:
          </Typography>
          <Box component="ul" sx={{ pl: 2, m: 0 }}>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}
              >
                AAA tokens (dashed green) have priority recovery up to 50% severity
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}
              >
                AA tokens (dashed blue) start losing value first
              </Typography>
            </Box>
            <Box component="li" sx={{ mb: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}
              >
                Orange line marks when one protocol is fully exploited (50%)
              </Typography>
            </Box>
            <Box component="li">
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}
              >
                Red line marks when both protocols are exploited (100%)
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default RiskChart;
