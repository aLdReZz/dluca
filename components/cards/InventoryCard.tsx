import React, { useState, useRef } from 'react';
import Card from '../Card';
import { useLongPress } from '../../hooks/useLongPress';
import {
  CubeIcon,
  BuildingStorefrontIcon,
  TagIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '../Icons';

export interface InventoryCardProps {
  id: string;
  productName: string;
  brand?: string;
  category?: string;
  price: number;
  stock: number;
  minStock?: number;
  maxStock?: number;
  supplier?: string;
  unit?: string;
  imageUrl?: string;
  onReorder?: () => void;
  onEdit?: () => void;
  className?: string;
}

const InventoryCard: React.FC<InventoryCardProps> = ({
  id,
  productName,
  brand,
  category,
  price,
  stock,
  minStock = 0,
  maxStock = 100,
  supplier,
  unit = 'pcs',
  imageUrl,
  onReorder,
  onEdit,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Calculate stock level percentage
  const stockPercentage = maxStock > 0 ? (stock / maxStock) * 100 : 0;
  const isLowStock = stock <= minStock;
  const isOutOfStock = stock === 0;

  // Stock level color
  const getStockColor = () => {
    if (isOutOfStock) return 'bg-accent-red';
    if (isLowStock) return 'bg-accent-orange';
    if (stockPercentage > 75) return 'bg-accent-green';
    return 'bg-accent-blue';
  };

  // Stock status
  const getStockStatus = () => {
    if (isOutOfStock) return { text: 'Out of Stock', color: 'text-accent-red', icon: ExclamationTriangleIcon };
    if (isLowStock) return { text: 'Low Stock', color: 'text-accent-orange', icon: ExclamationTriangleIcon };
    return { text: 'In Stock', color: 'text-accent-green', icon: CheckCircleIcon };
  };

  const stockStatus = getStockStatus();
  const StatusIcon = stockStatus.icon;

  useLongPress(cardRef, {
    onLongPress: () => {
      if (onReorder && isLowStock) {
        onReorder();
      }
    },
  });

  const compactView = (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-3">
        {/* Image thumbnail */}
        {imageUrl ? (
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-bg-tertiary flex-shrink-0">
            <img src={imageUrl} alt={productName} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-16 h-16 rounded-lg bg-bg-tertiary flex items-center justify-center flex-shrink-0">
            <CubeIcon className="w-8 h-8 text-text-tertiary" />
          </div>
        )}

        {/* Product info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary truncate">
            {productName}
          </h3>
          {brand && (
            <p className="text-xs text-text-secondary truncate">
              {brand}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
            {category && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-bg-tertiary text-text-secondary text-xs rounded">
                <TagIcon className="w-3 h-3" />
                {category}
              </span>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="text-right">
          <p className="text-lg font-bold text-text-primary">
            ₱{price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-text-tertiary">
            per {unit}
          </p>
        </div>
      </div>

      {/* Stock level */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <StatusIcon className={`w-4 h-4 ${stockStatus.color}`} />
            <span className={`text-xs font-medium ${stockStatus.color}`}>
              {stockStatus.text}
            </span>
          </div>
          <span className="text-xs text-text-secondary">
            {stock} / {maxStock} {unit}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className={`h-full ${getStockColor()} transition-all duration-300`}
            style={{ width: `${Math.min(stockPercentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );

  const expandedView = (
    <div className="space-y-3 pt-3 border-t border-border-color animate-fade-in-up">
      {/* Supplier */}
      {supplier && (
        <div className="flex items-center gap-2">
          <BuildingStorefrontIcon className="w-4 h-4 text-text-tertiary" />
          <div>
            <p className="text-xs text-text-tertiary">Supplier</p>
            <p className="text-sm text-text-primary font-medium">{supplier}</p>
          </div>
        </div>
      )}

      {/* Stock details */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-text-tertiary">Current Stock</p>
          <p className="text-sm text-text-primary font-medium">{stock} {unit}</p>
        </div>
        <div>
          <p className="text-xs text-text-tertiary">Min Stock</p>
          <p className="text-sm text-text-primary font-medium">{minStock} {unit}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {onReorder && isLowStock && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReorder();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent-orange/10 text-accent-orange rounded-lg hover:bg-accent-orange/20 transition-colors"
          >
            <CubeIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Reorder</span>
          </button>
        )}
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent-blue/10 text-accent-blue rounded-lg hover:bg-accent-blue/20 transition-colors"
          >
            <span className="text-sm font-medium">Edit</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div ref={cardRef}>
      <Card
        variant="interactive"
        expandable={true}
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

export default InventoryCard;
