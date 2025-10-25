import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import PrizeCard from './components/PrizeCard';
import ScratchCard from './components/ScratchCard';
import Toast from './components/Toast';
import './index.css';
import './styles/lottery.dark.css';
import LotteryV2ABI from './abi/LotteryV2.json';

const CONTRACT_ADDRESS = '0xa12FFC0499C29ac21e795cFb5EE46e7Db2940Dc4';
const SEPOLIA_CHAIN_ID = 11155111; // Sepolia 網絡 ID

interface Prize {
  tier: number;
  amount: string;
  left: number;
  total: number;
  probability: number;
}

const App: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [playedToday, setPlayedToday] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [result, setResult] = useState<{ tier: number; amount: string } | null>(null);
  const [revealed, setRevealed] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [txPending, setTxPending] = useState<boolean>(false);
  const [language, setLanguage] = useState<string>('en');
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(ethProvider);
      // 監聽網絡變化
      window.ethereum.on('chainChanged', () => {
        checkNetwork(ethProvider);
      });
      checkNetwork(ethProvider);
    } else {
      setError(`MetaMask 未檢測到。請於 ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })} 檢查安裝。`);
    }
  }, []);

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [language, i18n]);

  const checkNetwork = async (ethProvider: ethers.BrowserProvider) => {
    try {
      const network = await ethProvider.getNetwork();
      const currentChainId = Number(network.chainId);
      setChainId(currentChainId);
      if (currentChainId !== SEPOLIA_CHAIN_ID) {
        setError(`請切換至 Sepolia 網絡。當前網絡 ID: ${currentChainId}, 時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`);
        setContract(null);
        setAccount(null);
      }
    } catch (err) {
      setError(`無法獲取網絡資訊，時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`);
      console.error(err);
    }
  };

  const switchToSepolia = async () => {
    if (typeof window === 'undefined' || !window.ethereum) return false;
    try {
      // 0xaa36a7 is 11155111 in hex
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }],
      });
      return true;
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask.
      if (switchError?.code === 4902 || (switchError && switchError.message && switchError.message.includes('Unrecognized chain ID'))) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0xaa36a7',
                chainName: 'Sepolia',
                nativeCurrency: { name: 'SepoliaETH', symbol: 'SEP', decimals: 18 },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error('Add chain error', addError);
          setError(t('switchFailed'));
          return false;
        }
      }
      console.error('Switch chain error', switchError);
      setError(t('switchFailed'));
      return false;
    }
  };

  const connectWallet = async (autoPlay = false) => {
    try {
      if (provider) {
        const network = await provider.getNetwork();
        const currentChainId = Number(network.chainId);
        if (currentChainId !== SEPOLIA_CHAIN_ID) {
          await switchToSepolia();
          return false;
        }
        
        const accounts = await provider.send('eth_requestAccounts', []);
        const userSigner = await provider.getSigner();
        setSigner(userSigner);
        setAccount(accounts[0]);
        const lotteryContract = new ethers.Contract(CONTRACT_ADDRESS, LotteryV2ABI.abi, userSigner);
        setContract(lotteryContract);
        await fetchPrizes(lotteryContract);
        await fetchPlayedToday(lotteryContract, accounts[0]);

        if (autoPlay) {
          setTimeout(() => {
            playGame();
          }, 500);
        }
        return true;
      }
    } catch (err) {
      setError(`連接錢包失敗，時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`);
      console.error(err);
      return false;
    }
    return false;
  };

  const fetchPrizes = async (lotteryContract: ethers.Contract) => {
    const prizeList: Prize[] = [];
    for (let tier = 0; tier <= 6; tier++) {
      try {
        const prizeData = await lotteryContract.prizes(tier);
        prizeList.push({
          tier,
          amount: ethers.formatEther(prizeData.amount),
          left: Number(prizeData.left),
          total: Number(prizeData.total),
          probability: Number(prizeData.probability) / 100,
        });
      } catch (err) {
        console.error(`無法獲取獎項等級 ${tier} 的資料: ${err}, 時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`);
      }
    }
    setPrizes(prizeList);
  };

  const fetchPlayedToday = async (lotteryContract: ethers.Contract, userAccount: string) => {
    try {
      const count = await lotteryContract.playedToday(userAccount);
      setPlayedToday(Number(count.toString()));
    } catch (err) {
      console.error(`無法獲取今天已玩次數: ${err}, 時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}`);
    }
  };

  const playGame = async () => {
    if (!contract || !signer || playedToday >= 30) return;
    setIsPlaying(true);
    setError(null);
    setResult(null);
    try {
      const tx = await contract.play({ value: ethers.parseEther('0.01') });
      setTxPending(true);
      const receipt = await tx.wait();
      setTxPending(false);
      const playEvent = receipt?.logs.find((log: ethers.Log) => {
        try {
          const parsed = contract!.interface.parseLog(log);
          return parsed?.name === 'Play';
        } catch {
          return false;
        }
      });

      if (playEvent) {
        const parsed = contract!.interface.parseLog(playEvent);
        const tier = Number(parsed?.args.prizeTier);
        const amount = ethers.formatEther(tier === 6 ? '0' : parsed?.args.amount);
        setResult({ tier, amount });
      } else {
        setResult({ tier: 6, amount: '0' });
      }

      await fetchPrizes(contract!);
      await fetchPlayedToday(contract!, account!);
    } catch (err) {
      setError(`遊戲失敗，時間: ${new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}。${t('playFailed')}`);
      console.error(err);
    } finally {
      setIsPlaying(false);
    }
  };

  return (
      <div className="lottery-container flex flex-col items-center justify-center p-4 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="lottery-card"
        >
  <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            {t('title')}
          </h1>
          <div className="flex gap-2 mt-4 sm:mt-0">
            {['en', 'zh-TW', 'zh-CN'].map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 ${
                  language === lang
                    ? 'bg-blue-700 text-white'
                    : 'bg-blue-900 text-blue-200 hover:bg-blue-800'
                }`}
              >
                {t(lang === 'en' ? 'english' : lang === 'zh-TW' ? 'traditionalChinese' : 'simplifiedChinese')}
              </button>
            ))}
          </div>
        </div>

        {/* 刮刮樂位址：僅在有 result 時顯示 */}
        {result && (
          <div className="w-full max-w-2xl mx-auto mb-4">
            <div className="h-40 w-full flex items-center justify-center">
              <div className={`rounded-lg shadow-md overflow-hidden w-full ${result.tier === 6 ? 'bg-red-900/80' : 'bg-blue-700/80'}`}>
                <div className="h-40 w-full">
                  <ScratchCard result={result} onComplete={() => setRevealed(true)} />
                </div>
              </div>
            </div>

            {/* 刮完後，下方顯示剩餘獎品簡要 */}
            <div className="mt-3 flex flex-wrap gap-2 justify-center">
              {prizes.map((p) => (
                <div key={p.tier} className="bg-white/5 text-white/90 px-3 py-2 rounded-md text-sm">
                  {`等級 ${p.tier}: 剩餘 ${p.left}/${p.total}`}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8">
          {account && chainId === SEPOLIA_CHAIN_ID ? (
              <div className="wallet-status">
              <p className="text-blue-200">{t('connected', { address: `${account.slice(0, 6)}...${account.slice(-4)}` })}</p>
              <p className="text-blue-200">{t('playsLeft', { count: 30 - playedToday })}</p>
            </div>
          ) : (
              <div className="wallet-connect-prompt">
              <p className="text-blue-200 mb-2">{t('connectToPlay')}</p>
              <motion.button
                onClick={() => connectWallet(false)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                  className="connect-button"
              >
                {t('connectWallet')}
              </motion.button>
            </div>
          )}
        </div>

          <h2 className="prize-list-title">{t('prizeList')}</h2>
          <div className="prize-grid">
          {prizes.map((prize) => (
            <PrizeCard key={prize.tier} {...prize} />
          ))}
        </div>

        <div className="flex justify-center mb-8">
          <motion.button
            onClick={() => (!account ? connectWallet(true) : playGame())}
            disabled={account ? (isPlaying || playedToday >= 30) : false}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
              className="game-button"
          >
            {isPlaying ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="loading-spinner"
                >
                🎲
              </motion.span>
            ) : (
              t('tryLuck')
            )}
          </motion.button>
        </div>

        {result && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="result-container"
            >
            <div className={`text-center rounded-xl p-6 shadow-md w-full ${result.tier === 6 ? 'bg-red-900/80' : 'bg-blue-700/80'}`}>
              <h3 className="text-2xl font-bold text-white mb-2">{t('result')}</h3>
                      <div className="relative w-full mb-4">
                        <p className="text-xl font-semibold text-blue-200">
                          {revealed ? (result!.tier === 6 ? t('thanks') : t('wonPrize', { tier: result!.tier, amount: result!.amount })) : t('scratchToReveal')}
                        </p>
                      </div>
            </div>

            <div className="flex gap-4">
              <motion.button
                onClick={playGame}
                disabled={isPlaying || playedToday >= 30}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-md disabled:opacity-50"
              >
                {t('playAgain')}
              </motion.button>
              {result.tier !== 6 && (
                <motion.button
                  onClick={() => {
                    const text = t('shareMessage', { amount: result.amount });
                    if (navigator.share) {
                      navigator.share({
                        title: t('shareTitle'),
                        text: text,
                        url: window.location.href
                      });
                    } else {
                      navigator.clipboard.writeText(text);
                      setToastMessage(t('copiedToClipboard'));
                    }
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 shadow-md"
                >
                  {t('share')}
                </motion.button>
              )}
            </div>
          </motion.div>
      </>
    )}

      {error && <p className="error-message">{error}</p>}
            {txPending && (
              <div className="tx-overlay">
                <div className="flex flex-col items-center gap-4">
                  <div className="text-2xl font-bold text-white mb-2">{t('txPending')}</div>
                  <div className="text-sm text-white">{t('pleaseConfirm')}</div>
                </div>
              </div>
            )}
            <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      </motion.div>
    </div>
  );
};

export default App;