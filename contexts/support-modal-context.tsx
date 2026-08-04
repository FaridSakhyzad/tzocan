import React, { createContext, ReactNode, useContext, useMemo, useState } from 'react';

import { SupportModal } from '@/components/support-modal';
import { useSupportPurchases } from '@/hooks/use-support-purchases';

type SupportModalContextValue = {
  openSupportModal: () => void;
  closeSupportModal: () => void;
  hasPurchasedAnySupportProduct: boolean;
  canPurchaseAnySupportProduct: boolean;
};

const SupportModalContext = createContext<SupportModalContextValue | null>(null);

export function SupportModalProvider({ children }: { children: ReactNode }) {
  const [isSupportModalVisible, setIsSupportModalVisible] = useState(false);
  const {
    debugInfo,
    hasPurchasedAnySupportProduct,
    isLoading,
    isUnavailable,
    supportProducts,
    canPurchaseAnySupportProduct,
    purchaseProduct,
  } = useSupportPurchases();

  const value = useMemo<SupportModalContextValue>(() => ({
    openSupportModal: () => {
      setIsSupportModalVisible(true);
    },
    closeSupportModal: () => {
      setIsSupportModalVisible(false);
    },
    hasPurchasedAnySupportProduct,
    canPurchaseAnySupportProduct,
  }), [canPurchaseAnySupportProduct, hasPurchasedAnySupportProduct]);

  return (
    <SupportModalContext.Provider value={value}>
      {children}

      <SupportModal
        visible={isSupportModalVisible}
        onClose={value.closeSupportModal}
        products={supportProducts}
        isLoading={isLoading}
        isUnavailable={isUnavailable}
        debugInfo={debugInfo}
        onPurchase={purchaseProduct}
      />
    </SupportModalContext.Provider>
  );
}

export function useSupportModal() {
  const context = useContext(SupportModalContext);

  if (!context) {
    throw new Error('useSupportModal must be used within SupportModalProvider');
  }

  return context;
}
