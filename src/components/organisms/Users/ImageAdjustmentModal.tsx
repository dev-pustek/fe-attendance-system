import React, { useState, useRef, useEffect } from "react";
import Modal from "../../molecules/Modal";
import Button from "../../atoms/Button";
import { CloseIcon } from "../../atoms/Icons";

interface ImageAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  userName: string;
  initialAdjustment?: {
    scale: number;
    x: number;
    y: number;
  };
  onSave: (adjustment: { scale: number; x: number; y: number }) => void;
}

const ImageAdjustmentModal: React.FC<ImageAdjustmentModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  userName,
  initialAdjustment = { scale: 1, x: 0, y: 0 },
  onSave,
}) => {
  const [scale, setScale] = useState(initialAdjustment.scale);
  const [position, setPosition] = useState({ x: initialAdjustment.x, y: initialAdjustment.y });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setScale(initialAdjustment.scale);
      setPosition({ x: initialAdjustment.x, y: initialAdjustment.y });
    }
  }, [isOpen, initialAdjustment]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleSave = () => {
    onSave({ scale, x: position.x, y: position.y });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl">
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Adjust Photo
            </h3>
            <p className="text-sm text-gray-500 mt-1">{userName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <CloseIcon className="size-6" />
          </button>
        </div>

        {/* Image Preview Container */}
        <div className="mb-6">
          <div
            ref={imageContainerRef}
            className="relative w-full h-96 bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              className="absolute inset-0 flex items-center justify-center cursor-move"
              onMouseDown={handleMouseDown}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
            >
              <img
                src={imageUrl}
                alt={userName}
                className="max-w-none"
                draggable={false}
                style={{
                  userSelect: 'none',
                }}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Drag to reposition • Use slider to zoom
          </p>
        </div>

        {/* Zoom Control */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">
            Zoom Level: {Math.round(scale * 100)}%
          </label>
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.1"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-brand-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>50%</span>
            <span>300%</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            Reset
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={handleSave}>
              Save Adjustment
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ImageAdjustmentModal;
