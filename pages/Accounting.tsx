import React from 'react';
import Transactions from './accounting/Transactions';
import ProfitAndLoss from './accounting/ProfitAndLoss';

interface AccountingProps {
    activeView: 'transactions' | 'profitloss';
}

const Accounting: React.FC<AccountingProps> = ({ activeView }) => {
    return (
        <div className="h-full flex flex-col bg-bg-primary">
            {/* Header */}
            <div className="p-4 lg:p-6 border-b border-border-color sticky-mobile">
                <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">
                        {activeView === 'transactions' ? 'Transactions' : 'Profit and Loss'}
                    </h1>
                    <p className="text-sm text-text-secondary mt-1">
                        {activeView === 'transactions'
                            ? 'Track income, expenses and transfers'
                            : 'View profit and loss statements'}
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {activeView === 'transactions' && <Transactions />}
                {activeView === 'profitloss' && <ProfitAndLoss />}
            </div>
        </div>
    );
};

export default Accounting;
