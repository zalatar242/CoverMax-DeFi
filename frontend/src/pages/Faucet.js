import React, { useState, useEffect } from 'react';
import { useEthersSigner } from '../utils/walletConnector';
import { ethers } from 'ethers';
import FaucetABI from '../contracts.json';

function Faucet() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const signer = useEthersSigner();

    const requestTokens = async (type) => {
        if (!signer) {
            setError('Please connect your wallet first');
            return;
        }

        try {
            setLoading(true);
            setError('');
            setSuccess('');

            const faucetContract = new ethers.Contract(
                process.env.REACT_APP_FAUCET_ADDRESS,
                FaucetABI.networks.hardhat.Faucet.abi,
                signer
            );

            let tx;
            if (type === 'usdc') {
                tx = await faucetContract.requestTokens();
            } else if (type === 'eth') {
                tx = await faucetContract.requestEth();
            }
            await tx.wait();

            setSuccess(`Successfully claimed ${type.toUpperCase()}!`);
        } catch (err) {
            setError(err.message || `Failed to request ${type.toUpperCase()}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">Token Faucet</h1>

                <div className="bg-white shadow rounded-lg p-6">
                    <p className="text-gray-600 mb-6">
                        Get test tokens for testing the protocol. You can claim tokens once every 24 hours.
                    </p>

                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                            {success}
                        </div>
                    )}

                    <div className="space-y-4">
                        <button
                            onClick={() => requestTokens('usdc')}
                            disabled={loading || !signer}
                            className={`w-full bg-blue-500 text-white py-2 px-4 rounded ${
                                loading || !signer ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
                            }`}
                        >
                            {loading ? 'Claiming...' : 'Claim USDC'}
                        </button>

                        <button
                            onClick={() => requestTokens('eth')}
                            disabled={loading || !signer}
                            className={`w-full bg-purple-500 text-white py-2 px-4 rounded ${
                                loading || !signer ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-600'
                            }`}
                        >
                            {loading ? 'Claiming...' : 'Claim ETH'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Faucet;
