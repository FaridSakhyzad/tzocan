import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import {
  Product,
  endConnection,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
} from 'expo-iap';

import { SUPPORT_IAP_DEV_FALLBACK_PRICES_ENABLED } from '@/constants/app-config';
import { SUPPORT_PRODUCT_CONFIGS, SUPPORT_PRODUCT_IDS, type SupportProductId } from '@/constants/support-products';

const PURCHASED_SUPPORT_PRODUCTS_STORAGE_KEY = '@timecross_purchased_support_products';

type SupportProductRow = {
  id: SupportProductId;
  label: string;
  tier: 'standard' | 'future';
  price: string | null;
  isPurchased: boolean;
  isPurchasing: boolean;
  isDisabled: boolean;
};

type SupportPurchasesDebugInfo = {
  bundleIdentifier: string;
  requestPayload: string;
  fetchProductsResponse: string;
  lastError: string | null;
};

export type SupportDiagnosticsProduct = {
  id: SupportProductId;
  title: string;
  displayPrice: string | null;
  wasReturned: boolean;
};

export type SupportDiagnostics = {
  bundleIdentifier: string;
  storeConnectionState: 'idle' | 'connecting' | 'connected' | 'failed';
  returnedProductCount: number;
  products: SupportDiagnosticsProduct[];
  lastError: string | null;
  requestPayload: string;
  fetchProductsResponse: string;
};

function isSupportProductId(value: string): value is SupportProductId {
  return SUPPORT_PRODUCT_IDS.includes(value as SupportProductId);
}

function getBundleIdentifier() {
  return (
    Application.applicationId ??
    Constants.expoConfig?.ios?.bundleIdentifier ??
    Constants.expoConfig?.android?.package ??
    'unknown'
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function useSupportPurchases() {
  const hasDevFallbackProducts =
    __DEV__ &&
    Platform.OS !== 'android' &&
    SUPPORT_IAP_DEV_FALLBACK_PRICES_ENABLED &&
    SUPPORT_PRODUCT_CONFIGS.length > 0;
  const [productsById, setProductsById] = useState<Partial<Record<SupportProductId, Product>>>({});
  const [purchasedProductIds, setPurchasedProductIds] = useState<SupportProductId[]>([]);
  const [purchasingProductId, setPurchasingProductId] = useState<SupportProductId | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [storeConnectionState, setStoreConnectionState] = useState<
    SupportDiagnostics['storeConnectionState']
  >('idle');
  const [lastStoreError, setLastStoreError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<SupportPurchasesDebugInfo>({
    bundleIdentifier: getBundleIdentifier(),
    requestPayload: JSON.stringify({
      skus: [...SUPPORT_PRODUCT_IDS],
      type: 'in-app',
    }, null, 2),
    fetchProductsResponse: 'Not loaded yet',
    lastError: null,
  });

  const persistPurchasedProductIds = useCallback(async (productIds: SupportProductId[]) => {
    try {
      await AsyncStorage.setItem(PURCHASED_SUPPORT_PRODUCTS_STORAGE_KEY, JSON.stringify(productIds));
    } catch (error) {
      console.warn('Failed to persist purchased support products', error);
    }
  }, []);

  const mergePurchasedProductIds = useCallback((productIds: SupportProductId[]) => {
    setPurchasedProductIds((current) => {
      const next = Array.from(new Set([...current, ...productIds]));
      void persistPurchasedProductIds(next);
      return next;
    });
  }, [persistPurchasedProductIds]);

  useEffect(() => {
    let isMounted = true;
    let purchaseUpdatedSubscription: { remove: () => void } | null = null;
    let purchaseErrorSubscription: { remove: () => void } | null = null;

    const initializePurchases = async () => {
      try {
        if (isMounted) {
          setStoreConnectionState('connecting');
          setLastStoreError(null);
        }

        const storedPurchasedProductIds = await AsyncStorage.getItem(PURCHASED_SUPPORT_PRODUCTS_STORAGE_KEY);

        if (storedPurchasedProductIds && isMounted) {
          const parsedProductIds = JSON.parse(storedPurchasedProductIds) as string[];
          const validProductIds = parsedProductIds.filter(isSupportProductId);
          setPurchasedProductIds(validProductIds);
        }

        purchaseUpdatedSubscription = purchaseUpdatedListener(async (purchase) => {
          if (!isMounted || !isSupportProductId(purchase.productId)) {
            return;
          }

          try {
            await finishTransaction({
              purchase,
              isConsumable: false,
            });
            mergePurchasedProductIds([purchase.productId]);
          } catch (error) {
            console.warn('Failed to finish support purchase transaction', error);
          } finally {
            if (isMounted) {
              setPurchasingProductId(null);
            }
          }
        });

        purchaseErrorSubscription = purchaseErrorListener((error) => {
          if (!isMounted) {
            return;
          }

          console.warn('Support purchase failed', error);
          setLastStoreError(getErrorMessage(error));
          setPurchasingProductId(null);
        });

        await initConnection();

        const [products, availablePurchases] = await Promise.all([
          fetchProducts({
            skus: [...SUPPORT_PRODUCT_IDS],
            type: 'in-app',
          }),
          getAvailablePurchases(),
        ]);

        const safeDebugPayload = {
          products,
          availablePurchases: availablePurchases.map((purchase) => ({
            productId: purchase.productId,
            transactionId: purchase.transactionId,
            transactionDate: purchase.transactionDate,
          })),
        };

        if (!isMounted) {
          return;
        }

        setDebugInfo({
          bundleIdentifier: getBundleIdentifier(),
          requestPayload: JSON.stringify({
            skus: [...SUPPORT_PRODUCT_IDS],
            type: 'in-app',
          }, null, 2),
          fetchProductsResponse: JSON.stringify(safeDebugPayload, null, 2),
          lastError: null,
        });

        const nextProductsById: Partial<Record<SupportProductId, Product>> = {};
        const fetchedProducts = Array.isArray(products) ? products : [];

        for (const product of fetchedProducts) {
          if (product.type === 'in-app' && isSupportProductId(product.id)) {
            nextProductsById[product.id] = product;
          }
        }

        const restoredPurchasedProductIds = availablePurchases
          .map((purchase) => purchase.productId)
          .filter(isSupportProductId);

        setProductsById(nextProductsById);
        mergePurchasedProductIds(restoredPurchasedProductIds);
        setIsUnavailable(Object.keys(nextProductsById).length === 0 && !hasDevFallbackProducts);
        setStoreConnectionState('connected');
        setLastStoreError(null);
      } catch (error) {
        console.warn('Failed to initialize support purchases', error);

        if (isMounted) {
          setProductsById({});
          setDebugInfo({
            bundleIdentifier: getBundleIdentifier(),
            requestPayload: JSON.stringify({
              skus: [...SUPPORT_PRODUCT_IDS],
              type: 'in-app',
            }, null, 2),
            fetchProductsResponse: 'No response',
            lastError: getErrorMessage(error),
          });
          setStoreConnectionState('failed');
          setLastStoreError(getErrorMessage(error));
          setIsUnavailable(!hasDevFallbackProducts);
          setPurchasingProductId(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void initializePurchases();

    return () => {
      isMounted = false;
      purchaseUpdatedSubscription?.remove();
      purchaseErrorSubscription?.remove();
      void endConnection().catch((error) => {
        console.warn('Failed to close support purchase connection', error);
      });
    };
  }, [hasDevFallbackProducts, mergePurchasedProductIds]);

  const supportProducts = useMemo<SupportProductRow[]>(() => {
    const nextProducts: SupportProductRow[] = [];

    for (const productConfig of SUPPORT_PRODUCT_CONFIGS) {
      const product = productsById[productConfig.id];
      const isPurchased = purchasedProductIds.includes(productConfig.id);
      const isPurchasing = purchasingProductId === productConfig.id;
      const isDisabled = isUnavailable || !product || isPurchased || isPurchasing;

      nextProducts.push({
        id: productConfig.id,
        label: productConfig.label,
        tier: productConfig.tier,
        price: isPurchased
          ? null
          : product?.displayPrice ??
            (__DEV__ && Platform.OS !== 'android' && SUPPORT_IAP_DEV_FALLBACK_PRICES_ENABLED
              ? productConfig.devFallbackPrice
              : null),
        isPurchased,
        isPurchasing,
        isDisabled,
      });
    }

    return nextProducts;
  }, [isUnavailable, productsById, purchasedProductIds, purchasingProductId]);

  const diagnostics = useMemo<SupportDiagnostics>(() => ({
    bundleIdentifier: debugInfo.bundleIdentifier,
    storeConnectionState,
    returnedProductCount: Object.keys(productsById).length,
    products: SUPPORT_PRODUCT_CONFIGS.map((productConfig) => {
      const product = productsById[productConfig.id];

      return {
        id: productConfig.id,
        title: product?.displayName ?? product?.title ?? productConfig.label,
        displayPrice: product?.displayPrice ?? null,
        wasReturned: Boolean(product),
      };
    }),
    lastError: lastStoreError ?? debugInfo.lastError,
    requestPayload: debugInfo.requestPayload,
    fetchProductsResponse: debugInfo.fetchProductsResponse,
  }), [debugInfo, lastStoreError, productsById, storeConnectionState]);

  const hasPurchasedAnySupportProduct = useMemo(
    () => purchasedProductIds.length > 0,
    [purchasedProductIds]
  );

  const canPurchaseAnySupportProduct = useMemo(
    () => supportProducts.some((product) => !product.isPurchased),
    [supportProducts]
  );

  const purchaseProduct = useCallback(async (productId: SupportProductId) => {
    const isPurchased = purchasedProductIds.includes(productId);

    if (isPurchased || purchasingProductId) {
      return;
    }

    setPurchasingProductId(productId);

    try {
      await requestPurchase({
        request: {
          apple: {
            sku: productId,
          },
          google: {
            skus: [productId],
          },
        },
        type: 'in-app',
      });
    } catch (error) {
      console.warn('Failed to request support purchase', error);
      setLastStoreError(getErrorMessage(error));
      setPurchasingProductId(null);
    }
  }, [purchasedProductIds, purchasingProductId]);

  const restorePurchases = useCallback(async () => {
    if (isRestoring) {
      return [] as SupportProductId[];
    }

    setIsRestoring(true);

    try {
      const availablePurchases = await getAvailablePurchases();
      const restoredPurchasedProductIds = availablePurchases
        .map((purchase) => purchase.productId)
        .filter(isSupportProductId);

      mergePurchasedProductIds(restoredPurchasedProductIds);
      return restoredPurchasedProductIds;
    } finally {
      setIsRestoring(false);
    }
  }, [isRestoring, mergePurchasedProductIds]);

  const resetLocalPurchaseState = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(PURCHASED_SUPPORT_PRODUCTS_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear local support purchase state', error);
    }

    setPurchasedProductIds([]);
    setPurchasingProductId(null);
  }, []);

  return {
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
  };
}
