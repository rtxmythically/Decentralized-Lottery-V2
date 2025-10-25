import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScratchCardProps {
  result: { tier: number; amount: string };
  onComplete: () => void;
  onScratchStart?: () => void;
}

const ScratchCard: React.FC<ScratchCardProps> = React.forwardRef(({ result, onComplete, onScratchStart }, ref) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scratchAreaRef = useRef<HTMLDivElement>(null);
  const isScratching = useRef(false);
  const scratchProgress = useRef(0);
  const REVEAL_THRESHOLD = 0.5; // 50% scratched to fully reveal

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !scratchAreaRef.current) return;

  // match canvas to container size
  canvas.width = scratchAreaRef.current.offsetWidth;
  canvas.height = scratchAreaRef.current.offsetHeight;

  // 填充灰藍覆蓋層（覆蓋層）
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(100, 116, 139, 0.95)'; // 深藍灰
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // We intentionally don't draw prize text on the canvas; the prize text lives in a div behind the canvas.

    const getEventPosition = (e: MouseEvent | TouchEvent, canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    let scratchStarted = false;
    const handleStart = (e: MouseEvent | TouchEvent) => {
      if (isRevealed) return;
      e.preventDefault();
      isScratching.current = true;
      if (!scratchStarted) {
        scratchStarted = true;
        if (onScratchStart) onScratchStart();
      }
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (isRevealed) return;
      e.preventDefault();
      if (!isScratching.current || !ctx) return;

      const { x, y } = getEventPosition(e, canvas);
      
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // 計算刮除進度（透明像素比例）
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let transparentPixels = 0;
      const totalPixels = canvas.width * canvas.height;
      for (let i = 3; i < pixels.length; i += 4) {
        if (pixels[i] === 0) transparentPixels++;
      }
      scratchProgress.current = transparentPixels / totalPixels;

      if (scratchProgress.current >= REVEAL_THRESHOLD && !isRevealed) {
        isScratching.current = false;
        setIsRevealed(true);
        // Animate canvas fade then call onComplete
        if (canvas) {
          canvas.style.transition = 'opacity 400ms ease';
          canvas.style.opacity = '0';
          setTimeout(() => {
            onComplete();
          }, 420);
        } else {
          onComplete();
        }
      }
    };

    const handleEnd = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isScratching.current = false;
    };

    if (onScratchStart && !isScratching.current) {
      onScratchStart();
    }

    // Mouse events
    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('mouseleave', handleEnd);

    // Touch events
    canvas.addEventListener('touchstart', handleStart);
    canvas.addEventListener('touchmove', handleMove);
    canvas.addEventListener('touchend', handleEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleStart);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseup', handleEnd);
      canvas.removeEventListener('mouseleave', handleEnd);
      canvas.removeEventListener('touchstart', handleStart);
      canvas.removeEventListener('touchmove', handleMove);
      canvas.removeEventListener('touchend', handleEnd);
    };
  }, [result, onComplete]);

  React.useImperativeHandle(ref, () => ({
    reset: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
        if (canvas && ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = 'rgba(100, 116, 139, 0.95)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          scratchProgress.current = 0;
          setIsRevealed(false);
          canvas.style.opacity = '1';
        }
    },
      reveal: () => {
        setIsRevealed(true);
      }
  }));

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="scratch-card relative w-full h-full"
        ref={scratchAreaRef}
      >
        {/* prize text sits behind the canvas; we blur/low-opacity it until fully revealed */}
        <div
          className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-all duration-400 ${
            isRevealed ? 'opacity-100 blur-0' : 'opacity-30 blur-sm'
          }`}
        >
          <div className="text-center px-4">
            <h3 className="text-3xl font-bold mb-2">
              {result.tier === 6 ? '謝謝參與' : `獎金：${result.amount} ETH`}
            </h3>
            {!isRevealed && (
              <p className="text-sm text-white/70">刮開以查看完整結果</p>
            )}
          </div>
        </div>

        <canvas ref={canvasRef} className="w-full h-full rounded-lg relative" />
      </motion.div>
    </AnimatePresence>
  );
});

export default ScratchCard;