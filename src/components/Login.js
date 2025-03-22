import React, { useState } from 'react';
import { ethers } from 'ethers';
import '../styles/Login.css';

const Login = ({ onLogin }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const connectWallet = async () => {
        setIsLoading(true);
        setError('');
        
        try {
            if (!window.ethereum) {
                throw new Error('Please install MetaMask to use this application');
            }

            const provider = new ethers.providers.Web3Provider(window.ethereum);
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            const signer = provider.getSigner();
            const address = await signer.getAddress();
            
            onLogin(address);
        } catch (error) {
            console.error('Login error:', error);
            setError(error.message || 'Failed to connect wallet');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h1>Welcome to Minted AI</h1>
                <p className="subtitle">Connect your wallet to start creating AI-powered NFTs</p>
                
                <button 
                    className={`connect-button ${isLoading ? 'loading' : ''}`}
                    onClick={connectWallet}
                    disabled={isLoading}
                >
                    {isLoading ? 'Connecting...' : 'Connect with MetaMask'}
                </button>
                
                {error && <p className="error-message">{error}</p>}
                
                <div className="features">
                    <div className="feature">
                        <span className="feature-icon">🎨</span>
                        <h3>Create</h3>
                        <p>Generate unique AI art</p>
                    </div>
                    <div className="feature">
                        <span className="feature-icon">💎</span>
                        <h3>Mint</h3>
                        <p>Turn your art into NFTs</p>
                    </div>
                    <div className="feature">
                        <span className="feature-icon">💱</span>
                        <h3>Trade</h3>
                        <p>Buy and sell in the marketplace</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login; 