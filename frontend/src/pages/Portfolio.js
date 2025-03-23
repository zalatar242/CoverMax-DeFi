import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import { ethers } from 'ethers';
import contracts from '../contracts.json';

const Portfolio = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [balances, setBalances] = useState({
    trancheA: "0",
    trancheB: "0",
    trancheC: "0"
  });
  const [claimableAmounts, setClaimableAmounts] = useState({
    trancheA: "0",
    trancheB: "0",
    trancheC: "0"
  });

  const loadBalances = async () => {
    if (!window.ethereum) {
      setError("Please install MetaMask to use this feature");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      const insurancePool = new ethers.Contract(
        contracts.InsurancePool.address,
        contracts.InsurancePool.abi,
        signer
      );

      // Get tranche token balances
      const trancheABalance = await insurancePool.balanceOf(userAddress, 0);
      const trancheBBalance = await insurancePool.balanceOf(userAddress, 1);
      const trancheCBalance = await insurancePool.balanceOf(userAddress, 2);

      setBalances({
        trancheA: ethers.formatUnits(trancheABalance, 6),
        trancheB: ethers.formatUnits(trancheBBalance, 6),
        trancheC: ethers.formatUnits(trancheCBalance, 6)
      });

      // Get claimable amounts if in claim period
      try {
        const claimableA = await insurancePool.getClaimableAmount(userAddress, 0);
        const claimableB = await insurancePool.getClaimableAmount(userAddress, 1);
        const claimableC = await insurancePool.getClaimableAmount(userAddress, 2);

        setClaimableAmounts({
          trancheA: ethers.formatUnits(claimableA, 6),
          trancheB: ethers.formatUnits(claimableB, 6),
          trancheC: ethers.formatUnits(claimableC, 6)
        });
      } catch (err) {
        console.log("Not in claim period yet");
      }

    } catch (err) {
      console.error("Error loading portfolio:", err);
      setError("Error loading portfolio data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (trancheId) => {
    if (!window.ethereum) {
      setError("Please install MetaMask to use this feature");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const insurancePool = new ethers.Contract(
        contracts.InsurancePool.address,
        contracts.InsurancePool.abi,
        signer
      );

      // Claim for specific tranche
      const tx = await insurancePool.claim(trancheId);
      await tx.wait();

      // Reload balances after successful claim
      await loadBalances();

    } catch (err) {
      console.error("Error claiming:", err);
      setError("Error during claim. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadBalances();
  }, []);

  const TrancheCard = ({ title, balance, claimable, trancheId }) => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body1" gutterBottom>
          Balance: {balance} USDC
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Claimable: {claimable} USDC
        </Typography>
        <Button
          variant="contained"
          disabled={loading || parseFloat(claimable) <= 0}
          onClick={() => handleClaim(trancheId)}
          sx={{ mt: 1 }}
        >
          Claim
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Portfolio
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={4}>
              <TrancheCard
                title="Tranche A (Senior)"
                balance={balances.trancheA}
                claimable={claimableAmounts.trancheA}
                trancheId={0}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TrancheCard
                title="Tranche B (Mezzanine)"
                balance={balances.trancheB}
                claimable={claimableAmounts.trancheB}
                trancheId={1}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TrancheCard
                title="Tranche C (Junior)"
                balance={balances.trancheC}
                claimable={claimableAmounts.trancheC}
                trancheId={2}
              />
            </Grid>
          </Grid>

          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Transaction History
            </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Tranche</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      Transaction history coming soon
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default Portfolio;
