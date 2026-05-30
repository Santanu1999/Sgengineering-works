import React, { useState } from 'react';
import { dbAPI } from '../data/mock-database';
import { Lock, Unlock, ShieldAlert, Fingerprint } from 'lucide-react';
import { motion } from 'motion/react';

interface PINLockScreenProps {
  onUnlock: () => void;
}

export default function PINLockScreen({ onUnlock }: PINLockScreenProps) {
  const [pin, setPin] = useState<string>('');
  const [errorCount, setErrorCount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const correctPin = dbAPI.getPIN();

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setErrorMessage('');

      if (nextPin.length === 4) {
        // Trigger validation automatically
        if (nextPin === correctPin) {
          setIsSuccess(true);
          setTimeout(() => {
            onUnlock();
          }, 400);
        } else {
          setTimeout(() => {
            setErrorCount((prev) => prev + 1);
            setErrorMessage('Incorrect Security PIN. Verification Failed.');
            setPin('');
          }, 350);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  const handleBiometricMock = () => {
    // Biometric access trigger simulation
    setErrorMessage('Simulating local Android biometric hardware callback...');
    setTimeout(() => {
      setIsSuccess(true);
      setTimeout(() => {
        onUnlock();
      }, 300);
    }, 800);
  };

  return (
    <div id="pin-screen-container" className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center z-50 p-4 font-sans select-none text-slate-100">
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Animated Security Status */}
        <div className="mb-8 flex flex-col items-center">
          <motion.div
            animate={isSuccess ? { scale: [1, 1.2, 1], backgroundColor: '#10b981' } : {}}
            transition={{ duration: 0.4 }}
            className={`w-20 h-20 rounded-full flex items-center justify-center ${
              isSuccess ? 'bg-emerald-500' : 'bg-slate-900 border border-slate-800'
            } shadow-lg shadow-slate-950/50 mb-3`}
          >
            {isSuccess ? (
              <Unlock className="w-8 h-8 text-white" />
            ) : (
              <Lock className="w-8 h-8 text-blue-400" />
            )}
          </motion.div>
          <h2 id="pin-primary-label" className="text-xl font-serif tracking-tight text-white font-semibold">
            SG Engineering Works Manager
          </h2>
          <p id="pin-secondary-label" className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-mono">
            Encrypted SQLite Offline Sandbox
          </p>
        </div>

        {/* PIN Indicators */}
        <div id="pin-indicators" className="flex justify-center space-x-4 mb-8">
          {[0, 1, 2, 3].map((idx) => {
            const hasChar = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  hasChar
                    ? 'bg-blue-400 border-blue-400 scale-110 shadow-sm shadow-blue-400/50'
                    : 'bg-transparent border-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Error Feedback */}
        <div className="h-6 mb-4 flex items-center justify-center">
          {errorMessage && (
            <div className="flex items-center space-x-2 text-rose-400 text-sm font-mono animate-bounce">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Digital Grid Pad */}
        <div id="pin-digital-keypad-grid" className="grid grid-cols-3 gap-4 w-full px-6 mb-6">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              onClick={() => handleKeyPress(num)}
              disabled={isSuccess}
              key={num}
              className="w-full aspect-square text-2xl font-serif flex items-center justify-center rounded-full bg-slate-900 hover:bg-slate-850 active:bg-slate-800 border border-slate-850 transition duration-100 text-white font-medium shadow-md outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              {num}
            </button>
          ))}
          {/* Backspace Button */}
          <button
            onClick={handleDelete}
            disabled={isSuccess}
            className="w-full aspect-square text-sm font-mono flex items-center justify-center rounded-full text-slate-400 hover:text-white bg-slate-950/20 hover:bg-slate-900 transition outline-none cursor-pointer"
          >
            Clear
          </button>
          {/* 0 Button */}
          <button
            onClick={() => handleKeyPress('0')}
            disabled={isSuccess}
            className="w-full aspect-square text-2xl font-serif flex items-center justify-center rounded-full bg-slate-900 hover:bg-slate-850 active:bg-slate-800 border border-slate-850 transition duration-100 text-white font-medium shadow-md outline-none cursor-pointer"
          >
            0
          </button>
          {/* Biometrics Authorization Trigger */}
          <button
            onClick={handleBiometricMock}
            disabled={isSuccess}
            className="w-full aspect-square flex flex-col items-center justify-center rounded-full text-blue-400 hover:text-blue-300 bg-blue-950/20 border border-blue-950 hover:bg-blue-900/30 transition outline-none cursor-pointer p-1"
          >
            <Fingerprint className="w-6 h-6 mb-1" />
            <span className="text-[9px] uppercase tracking-wider font-semibold">Bio</span>
          </button>
        </div>

        {/* Informational Guidance Helper */}
        <p className="text-[11px] text-slate-500 font-mono text-center">
          Default Lock Screen Bypass Code: <strong className="text-slate-400">1234</strong>
        </p>
      </div>
    </div>
  );
}
