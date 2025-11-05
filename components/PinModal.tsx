import React, { useState, useRef, useEffect } from 'react';
import { ExclamationCircleIcon } from './Icons';

interface PinModalProps {
    onClose: () => void;
    onVerify: (pin: string) => boolean;
    onSuccess: () => void;
}

const PinModal: React.FC<PinModalProps> = ({ onClose, onVerify, onSuccess }) => {
    const [pin, setPin] = useState<string[]>(['', '', '', '']);
    const [error, setError] = useState<boolean>(false);
    const [success, setSuccess] = useState<boolean>(false);
    const [activeField, setActiveField] = useState<number | null>(null);
    const [isCompleting, setIsCompleting] = useState(false);
    const [ripplePosition, setRipplePosition] = useState<{ top: number; left: number } | null>(null);
    const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
    const logoRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        inputsRef.current[0]?.focus();
        setActiveField(0);
    }, []);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
        if (isCompleting) return;

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
        if (isCompleting) return;

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
        if (isCompleting) return;

        if (onVerify(fullPin)) {
            setSuccess(true);
            setActiveField(null);

            const rect = logoRef.current?.getBoundingClientRect();
            if (rect) {
                setRipplePosition({
                    top: rect.top + rect.height / 2,
                    left: rect.left + rect.width / 2
                });
            } else {
                setRipplePosition(null);
            }

            setIsCompleting(true);
            setTimeout(() => {
                onSuccess();
            }, 750);
        } else {
            setError(true);
            setTimeout(() => {
                setPin(['', '', '', '']);
                setError(false);
                inputsRef.current[0]?.focus();
                setActiveField(0);
            }, 1000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex justify-center items-center z-50 transition-opacity duration-300 ease-in-out pin-overlay-animate">
            <div className={`relative bg-white/10 backdrop-blur-2xl border border-white/12 rounded-2xl px-8 py-10 w-full max-w-sm text-center shadow-[0_18px_50px_rgba(0,0,0,0.42)] before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/18 before:via-white/8 before:to-white/0 before:opacity-65 before:pointer-events-none ${isCompleting ? 'pin-modal-approve' : 'pin-modal-animate'}`}>
                <div
                    ref={logoRef}
                    className="mx-auto -mt-16 mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-transparent shadow-[0_22px_40px_rgba(0,0,0,0.38)] backdrop-blur-2xl relative"
                >
                    <img src="/dlc-sublogo.png" alt="D'Luca Icon" className="w-20 h-20 object-contain drop-shadow-[0_8px_22px_rgba(0,0,0,0.5)]" />
                    {isCompleting && (
                        <span className="absolute inset-0 rounded-full pin-success-ring" />
                    )}
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-semibold tracking-wide text-white drop-shadow-md">Enter Admin PIN</h2>
                    <p className="text-text-secondary/80 text-sm">Enter the 4-digit PIN to continue.</p>
                </div>
                <div className="mt-6 flex justify-center gap-3">
                    {pin.map((digit, index) => (
                        <div key={index} className="relative w-14 h-14">
                            <input
                                ref={(el) => { inputsRef.current[index] = el; }}
                                type="password"
                                maxLength={1}
                                value={digit}
                                onFocus={() => setActiveField(index)}
                                onBlur={() => setActiveField(null)}
                                onChange={(e) => handleInputChange(e, index)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                style={{ caretColor: 'transparent' }}
                                className={`w-full h-full text-2xl text-center bg-white/12 border border-white/18 text-text-primary rounded-xl transition-all duration-300 focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/40 backdrop-blur-lg shadow-inner shadow-black/35 ${error ? 'border-accent-red/70 animate-shake' : ''} ${success ? 'border-accent-green/70 ring-2 ring-accent-green/30' : ''}`}
                                disabled={isCompleting}
                            />
                            {activeField === index && !digit && (
                                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                    <span className="pin-caret-dot block h-3 w-3 rounded-full bg-white"></span>
                                </span>
                            )}
                        </div>
                    ))}
                </div>
                {error && (
                    <div className="mt-4 flex items-center justify-center text-accent-red/90 text-sm font-medium backdrop-blur-sm">
                        <ExclamationCircleIcon className="w-5 h-5 mr-2" />
                        Incorrect PIN. Please try again.
                    </div>
                )}
                <button
                    className="mt-8 px-5 py-2 text-sm font-medium text-white/75 hover:text-white transition-colors duration-200 rounded-full border border-white/18 backdrop-blur-sm hover:border-white/35 disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={onClose}
                    disabled={isCompleting}
                >
                    Cancel
                </button>
            </div>
            {isCompleting && (
                <div className="pointer-events-none fixed inset-0 overflow-hidden">
                    <div
                        className="pin-success-ripple"
                        style={
                            ripplePosition
                                ? { top: `${ripplePosition.top}px`, left: `${ripplePosition.left}px` }
                                : { top: '50%', left: '50%' }
                        }
                    />
                </div>
            )}
        </div>
    );
};

export default PinModal;
