import React, { useState } from 'react';
import Card from '../Card';
import {
  ArrowUpIcon,
  ArrowDownIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  TagIcon,
  DocumentTextIcon,
} from '../Icons';

export interface AccountingCardProps {
  id: string;
  date: string;
  type: 'credit' | 'debit';
  account: string;
  category?: string;
  description?: string;
  reference?: string;
  amount: number;
  runningBalance?: number;
  accountIcon?: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
}

const AccountingCard: React.FC<AccountingCardProps> = ({
  id,
  date,
  type,
  account,
  category,
  description,
  reference,
  amount,
  runningBalance,
  accountIcon,
  onEdit,
  onDelete,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const isCredit = type === 'credit';
  const typeColor = isCredit ? 'text-accent-green' : 'text-accent-red';
  const typeBg = isCredit ? 'bg-accent-green/10' : 'bg-accent-red/10';
  const TypeIcon = isCredit ? ArrowUpIcon : ArrowDownIcon;

  const compactView = (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Account icon */}
          <div className={`p-2 rounded-lg ${typeBg} flex-shrink-0`}>
            {accountIcon || <BuildingLibraryIcon className={`w-5 h-5 ${typeColor}`} />}
          </div>

          {/* Account details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-text-primary truncate">
                {account}
              </h3>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${typeBg}`}>
                <TypeIcon className={`w-3 h-3 ${typeColor}`} />
                <span className={`text-xs font-medium ${typeColor} capitalize`}>
                  {type}
                </span>
              </div>
            </div>
            {category && (
              <div className="flex items-center gap-1 mt-1">
                <TagIcon className="w-3 h-3 text-text-tertiary" />
                <span className="text-xs text-text-secondary truncate">
                  {category}
                </span>
              </div>
            )}
            <p className="text-xs text-text-tertiary mt-1">
              {date}
            </p>
          </div>
        </div>

        {/* Amount */}
        <div className="text-right flex-shrink-0">
          <p className={`text-lg font-bold ${typeColor}`}>
            {isCredit ? '+' : '-'}₱{amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </p>
          {runningBalance !== undefined && (
            <p className="text-xs text-text-tertiary mt-1">
              Bal: ₱{runningBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>
      </div>

      {/* Description preview */}
      {description && !isExpanded && (
        <p className="text-sm text-text-secondary line-clamp-1 pl-11">
          {description}
        </p>
      )}
    </div>
  );

  const expandedView = (
    <div className="space-y-3 pt-3 border-t border-border-color animate-fade-in-up">
      {/* Full description */}
      {description && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DocumentTextIcon className="w-4 h-4 text-text-tertiary" />
            <h4 className="text-xs font-semibold text-text-secondary uppercase">Description</h4>
          </div>
          <p className="text-sm text-text-primary pl-6">
            {description}
          </p>
        </div>
      )}

      {/* Reference */}
      {reference && (
        <div className="flex items-center justify-between pl-6">
          <span className="text-xs text-text-tertiary">Reference</span>
          <span className="text-sm text-text-primary font-medium">{reference}</span>
        </div>
      )}

      {/* Transaction details */}
      <div className="grid grid-cols-2 gap-3 pl-6">
        <div>
          <p className="text-xs text-text-tertiary">Transaction Type</p>
          <p className={`text-sm font-medium ${typeColor} capitalize`}>{type}</p>
        </div>
        <div>
          <p className="text-xs text-text-tertiary">Date</p>
          <p className="text-sm text-text-primary font-medium">{date}</p>
        </div>
      </div>

      {/* Running balance highlight */}
      {runningBalance !== undefined && (
        <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
          <span className="text-sm text-text-secondary">Running Balance</span>
          <span className="text-lg font-bold text-text-primary">
            ₱{runningBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
              className="flex-1 px-3 py-2 bg-accent-blue/10 text-accent-blue text-sm font-medium rounded-lg hover:bg-accent-blue/20 transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="flex-1 px-3 py-2 bg-accent-red/10 text-accent-red text-sm font-medium rounded-lg hover:bg-accent-red/20 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <Card
      variant="interactive"
      expandable={!!(description || reference)}
      expanded={isExpanded}
      onExpandChange={setIsExpanded}
      className={className}
    >
      {compactView}
      {isExpanded && expandedView}
    </Card>
  );
};

export default AccountingCard;
