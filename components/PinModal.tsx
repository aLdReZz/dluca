
import React, { useState, useRef, useEffect } from 'react';
import { LockClosedIcon, ExclamationCircleIcon } from './Icons';

interface PinModalProps {
    onClose: () => void;
    onVerify: (pin: string) => boolean;
}

const PinModal: React.FC<PinModalProps> = ({ onClose, onVerify }) => {
    const [pin, setPin] = useState<string[]>(['', '', '', '']);
    const [error, setError] = useState<boolean>(false);
    const [success, setSuccess] = useState<boolean>(false);
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        inputsRef.current[0]?.focus();
    }, []);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []); // Modal is only mounted when open

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        const value = e.target.value;
        if (isNaN(Number(value))) return;

        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);
        setError(false);

        if (value && index < 3) {
            inputsRef.current[index + 1]?.focus();
        }
        
        if (newPin.every(digit => digit !== '')) {
            verify(newPin.join(''));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace') {
            if (pin[index] === '' && index > 0) {
                inputsRef.current[index - 1]?.focus();
            }
            const newPin = [...pin];
            newPin[index] = '';
            setPin(newPin);
        }
    };

    const verify = (fullPin: string) => {
        if (onVerify(fullPin)) {
            setSuccess(true);
            setTimeout(onClose, 500); 
        } else {
            setError(true);
            setTimeout(() => {
                setPin(['', '', '', '']);
                setError(false);
                inputsRef.current[0]?.focus();
            }, 1000);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 transition-opacity duration-300 ease-in-out">
            <div className="bg-bg-secondary p-8 rounded-xl text-center max-w-sm w-11/12 border border-border-color shadow-2xl">
                <div className="w-12 h-12 bg-bg-tertiary rounded-full flex items-center justify-center mx-auto mb-4">
                    <LockClosedIcon className="w-6 h-6 text-text-secondary" />
                </div>
                <h2 className="text-2xl font-semibold mb-2">Enter Admin PIN</h2>
                <p className="text-text-secondary mb-6">Enter the 4-digit PIN to continue.</p>
                <div className="flex justify-center gap-3 mb-6">
                    {pin.map((digit, index) => (
                        <input
                            key={index}
                            ref={(el) => {inputsRef.current[index] = el}}
                            type="password"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleInputChange(e, index)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            className={`w-14 h-14 text-3xl text-center bg-bg-primary border border-border-color text-text-primary rounded-lg transition-all duration-300 focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/50 ${error ? 'border-accent-red animate-shake' : ''} ${success ? 'border-accent-green' : ''}`}
                        />
                    ))}
                </div>
                {error && (
                     <div className="flex items-center justify-center text-accent-red mb-4 text-sm">
                        <ExclamationCircleIcon className="w-5 h-5 mr-2" />
                        Incorrect PIN. Please try again.
                    </div>
                )}
                <button
                    className="bg-transparent border-none text-text-secondary cursor-pointer text-sm py-2 px-4 transition-colors hover:text-text-primary"
                    onClick={onClose}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default PinModal;