import React, { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Linking, Platform } from 'react-native';

import { SupportModal } from '@/components/support-modal';
import { STRIPE_SUPPORT_SUCCESS_URL } from '@/constants/app-config';
import { SupportDiagnostics, useSupportPurchases } from '@/hooks/use-support-purchases';

const STRIPE_SUPPORT_ACKNOWLEDGED_STORAGE_KEY = '@timecross_stripe_support_acknowledged';

function isStripeSupportSuccessUrl(url: string | null) {
  if (!url) {
    return false;
  }

  return url.startsWith(STRIPE_SUPPORT_SUCCESS_URL);
}

type SupportModalContextValue = {
  openSupportModal: () => void;
  closeSupportModal: () => void;
  hasPurchasedAnySupportProduct: boolean;
  hasAcknowledgedSupportOutsideStore: boolean;
  canPurchaseAnySupportProduct: boolean;
  isSupportPurchasesLoading: boolean;
  isRestoringSupportPurchases: boolean;
  isSupportUnavailable: boolean;
  diagnostics: SupportDiagnostics;
  restoreSupportPurchases: () => Promise<string[]>;
  acknowledgeSupportOutsideStore: () => Promise<void>;
  resetSupportLocalState: () => Promise<void>;
};

const SupportModalContext = createContext<SupportModalContextValue | null>(null);

export function SupportModalProvider({ children }: { children: ReactNode }) {
  const [isSupportModalVisible, setIsSupportModalVisible] = useState(false);
  const [hasAcknowledgedSupportOutsideStore, setHasAcknowledgedSupportOutsideStore] = useState(false);
  const {
    debugInfo,
    diagnostics,
    hasPurchasedAnySupportProduct,
    isLoading,
    isRestoring,
    isUnavailable,
    supportProducts,
    canPurchaseAnySupportProduct,
    purchaseProduct,
    restorePurchases,
    resetLocalPurchaseState,
  } = useSupportPurchases();

  React.useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    let isMounted = true;

    const loadAcknowledgedSupportState = async () => {
      try {
        const storedValue = await AsyncStorage.getItem(STRIPE_SUPPORT_ACKNOWLEDGED_STORAGE_KEY);

        if (isMounted) {
          setHasAcknowledgedSupportOutsideStore(storedValue === 'true');
        }
      } catch (error) {
        console.warn('Failed to load external support acknowledgement', error);
      }
    };

    void loadAcknowledgedSupportState();

    return () => {
      isMounted = false;
    };
  }, []);

  const acknowledgeSupportOutsideStore = React.useCallback(async () => {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      await AsyncStorage.setItem(STRIPE_SUPPORT_ACKNOWLEDGED_STORAGE_KEY, 'true');
      setHasAcknowledgedSupportOutsideStore(true);
    } catch (error) {
      console.warn('Failed to persist external support acknowledgement', error);
    }
  }, []);

  const resetSupportLocalState = React.useCallback(async () => {
    await resetLocalPurchaseState();

    if (Platform.OS !== 'android') {
      return;
    }

    try {
      await AsyncStorage.removeItem(STRIPE_SUPPORT_ACKNOWLEDGED_STORAGE_KEY);
      setHasAcknowledgedSupportOutsideStore(false);
    } catch (error) {
      console.warn('Failed to clear external support acknowledgement', error);
    }
  }, [resetLocalPurchaseState]);

  React.useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    let isMounted = true;

    const handleStripeSupportSuccess = async (url: string | null) => {
      if (!isMounted || !isStripeSupportSuccessUrl(url)) {
        return;
      }

      await acknowledgeSupportOutsideStore();
      setIsSupportModalVisible(false);
    };

    void Linking.getInitialURL().then(handleStripeSupportSuccess).catch((error) => {
      console.warn('Failed to read initial support return URL', error);
    });

    const subscription = Linking.addEventListener('url', (event) => {
      void handleStripeSupportSuccess(event.url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [acknowledgeSupportOutsideStore]);

  const value = useMemo<SupportModalContextValue>(() => ({
    openSupportModal: () => {
      setIsSupportModalVisible(true);
    },
    closeSupportModal: () => {
      setIsSupportModalVisible(false);
    },
    hasPurchasedAnySupportProduct,
    hasAcknowledgedSupportOutsideStore,
    canPurchaseAnySupportProduct,
    isSupportPurchasesLoading: isLoading,
    isRestoringSupportPurchases: isRestoring,
    isSupportUnavailable: isUnavailable,
    diagnostics,
    restoreSupportPurchases: restorePurchases,
    acknowledgeSupportOutsideStore,
    resetSupportLocalState,
  }), [
    acknowledgeSupportOutsideStore,
    canPurchaseAnySupportProduct,
    diagnostics,
    hasAcknowledgedSupportOutsideStore,
    hasPurchasedAnySupportProduct,
    isLoading,
    isRestoring,
    isUnavailable,
    resetSupportLocalState,
    restorePurchases,
  ]);

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
