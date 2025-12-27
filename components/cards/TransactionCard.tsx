import React, { useState, useRef } from 'react';
import Card from '../Card';
import { useGestures } from '../../hooks/useGestures';
import {
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CreditCardIcon,
  BanknotesIcon,
  DevicePhoneMobileIcon,
} from '../Icons';

export interface TransactionCardProps {
  id: string;
  receiptNumber: string;
  time: string;
  date: string;
  paymentType: 'cash' | 'gcash' | 'card' | 'bank';
  amount: number;
  items?: Array<{ name: string; quantity: number; price: number }>;
  serviceCharge?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

const TransactionCard: React.FC<TransactionCardProps> = ({
  id,
  receiptNumber,
  time,
  date,
  paymentType,
  amount,
  items = [],
  serviceCharge,
  onEdit,
  onDelete,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const paymentIcons = {
    cash: <BanknotesIcon className="w-4 h-4" />,
    gcash: <DevicePhoneMobileIcon className="w-4 h-4" />,
    card: <CreditCardIcon className="w-4 h-4" />,
    bank: <CreditCardIcon className="w-4 h-4" />,
  };

  const paymentColors = {
    cash: 'text-accent-green',
    gcash: 'text-accent-blue',
    card: 'text-accent-purple',
    bank: 'text-accent-cyan',
  };

  useGestures(cardRef, {
    onSwipeRight: onEdit,
    onSwipeLeft: onDelete,
    threshold: 100,
  });

  const compactView = (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">
            Receipt #{receiptNumber}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <ClockIcon className="w-3 h-3 text-text-tertiary" />
            <span className="text-xs text-text-tertiary">
              {time} • {date}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-text-primary">
            ₱{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Payment type badge */}
      <div className="flex items-center gap-2">
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-tertiary ${paymentColors[paymentType]}`}>
          {paymentIcons[paymentType]}
          <span className="text-xs font-medium capitalize">
            {paymentType}
          </span>
        </div>
        {items.length > 0 && (
          <span className="text-xs text-text-tertiary">
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );

  const expandedView = (
    <div className="space-y-3 pt-3 border-t border-border-color animate-fade-in-up">
      {/* Items list */}
      {items.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-text-secondary uppercase">Items</h4>
          {items.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span className="text-text-secondary">
                {item.quantity}x {item.name}
              </span>
              <span className="text-text-primary font-medium">
                ₱{item.price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Service charge */}
      {serviceCharge !== undefined && serviceCharge > 0 && (
        <div className="flex justify-between text-sm pt-2 border-t border-border-color">
          <span className="text-text-secondary">Service Charge</span>
          <span className="text-text-primary font-medium">
            ₱{serviceCharge.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* Actions */}
      {(onEdit || onDelete) && (
        <div className="flex gap-2 pt-2">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent-blue/10 text-accent-blue rounded-lg hover:bg-accent-blue/20 transition-colors"
            >
              <PencilIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Edit</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent-red/10 text-accent-red rounded-lg hover:bg-accent-red/20 transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
              <span className="text-sm font-medium">Delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div ref={cardRef}>
      <Card
        variant="interactive"
        expandable={items.length > 0}
        expanded={isExpanded}
        onExpandChange={setIsExpanded}
        className={className}
      >
        {compactView}
        {isExpanded && expandedView}
      </Card>
    </div>
  );
};

export default TransactionCard;
