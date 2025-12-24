import React from 'react';
import Transactions from './accounting/Transactions';
import ProfitAndLoss from './accounting/ProfitAndLoss';
import ChartOfAccounts from './accounting/ChartOfAccounts';

interface AccountingProps {
    activeView: 'transactions' | 'profitloss' | 'chartofaccounts';
}

const Accounting: React.FC<AccountingProps> = ({ activeView }) => {
    const getTitle = () => {
        switch (activeView) {
            case 'transactions': return 'Transactions';
            case 'profitloss': return 'Profit and Loss';
            case 'chartofaccounts': return 'Chart of Accounts';
            default: return 'Accounting';
        }
    };

    const getDescription = () => {
        switch (activeView) {
            case 'transactions': return 'Track income, expenses and transfers';
            case 'profitloss': return 'View profit and loss statements';
            case 'chartofaccounts': return 'Manage account categories';
            default: return '';
        }
    };

    return (
        <div className="h-full flex flex-col bg-bg-primary">
            {/* Header - Hidden for Profit and Loss */}
            {activeView !== 'profitloss' && (
                <div className="p-3 sm:p-4 lg:p-6 border-b border-border-color sticky-mobile">
                    <div>
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary">
                            {getTitle()}
                        </h1>
                        <p className="text-xs sm:text-sm text-text-secondary mt-0.5 sm:mt-1">
                            {getDescription()}
                        </p>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto">
                {activeView === 'transactions' && <Transactions />}
                {activeView === 'profitloss' && <ProfitAndLoss />}
                {activeView === 'chartofaccounts' && <ChartOfAccounts />}
            </div>
        </div>
    );
};

export default Accounting;
