import {
  Animated,
  ImageBackground,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { STRIPE_SUPPORT_URL, SUPPORT_IAP_DEBUG_ENABLED } from '@/constants/app-config';
import IconCancelOutlined from '@/assets/images/icon--x-3--outlined.svg';
import type { UiTheme } from '@/constants/ui-theme.types';
import { SUPPORT_PRODUCT_CONFIGS, SupportProductId } from '@/constants/support-products';
import { useAppTheme } from '@/contexts/app-theme-context';
import { useI18n } from '@/hooks/use-i18n';
import { useModalVisibilityAnimation } from '@/hooks/use-modal-visibility-animation';
import { SupportIapDebug } from '@/components/support-iap-debug';

import HeartIconSmall from '@/assets/images/icon--heart-1.svg';

import HeartIcon from '@/assets/images/icon--heart-2--outlined.svg';
import CoffeeIcon from '@/assets/images/icon--coffee-1--outlined.svg';
import StarIcon from '@/assets/images/icon--star-1--outlined.svg';

type SupportProductRow = {
  id: SupportProductId;
  label: string;
  tier: 'standard' | 'future';
  price: string | null;
  isPurchased: boolean;
  isPurchasing: boolean;
  isDisabled: boolean;
};

type SupportModalProps = {
  visible: boolean;
  onClose: () => void;
  products: SupportProductRow[];
  isLoading: boolean;
  isUnavailable: boolean;
  debugInfo: {
    bundleIdentifier: string;
    requestPayload: string;
    fetchProductsResponse: string;
    lastError: string | null;
  };
  onPurchase: (productId: SupportProductId) => void;
};

export function SupportModal({
  visible,
  onClose,
  products,
  isLoading,
  isUnavailable,
  debugInfo,
  onPurchase,
}: SupportModalProps) {
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { isMounted, opacity } = useModalVisibilityAnimation(visible);
  const insets = useSafeAreaInsets();
  const [isShowingFutureDevelopment, setIsShowingFutureDevelopment] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsShowingFutureDevelopment(false);
    }
  }, [visible]);

  const standardProducts = products.filter((product) => product.tier === 'standard');
  const futureProducts = products.filter((product) => product.tier === 'future');
  const visibleProducts = isShowingFutureDevelopment ? futureProducts : standardProducts;
  const shouldShowAndroidExternalSupport = Platform.OS === 'android' && isUnavailable;

  const handleOpenExternalSupport = async () => {
    try {
      await Linking.openURL(STRIPE_SUPPORT_URL);
      onClose();
    } catch (error) {
      console.warn('Failed to open external support link', error);
    }
  };

  if (!isMounted) {
    return null;
  }

  return (
    <Modal
      visible={isMounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.backgroundImage, { opacity }]}>
        <ImageBackground
          source={theme.image.modalBackgroundSource}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.modalBg}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View
              style={[
                styles.safeArea,
                {
                  paddingTop: insets.top,
                  paddingBottom: insets.bottom,
                },
              ]}
            >
              <View style={[
                styles.modalContent,
              ]}>
                <View style={styles.pad}>
                  <Pressable onPress={onClose} style={styles.cancelButton}>
                    <IconCancelOutlined fill={theme.text.primary} />
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.content,
                    isShowingFutureDevelopment && styles.contentFuture,
                  ]}
                >
                  <View style={styles.header}>
                    <Text style={styles.descriptionText}>{t('support.description')}</Text>
                  </View>

                  {isLoading && (
                    <View style={styles.productButtonBox}>
                      <Text style={styles.stateText}>{t('common.loading')}</Text>
                    </View>
                  )}

                  {!isLoading && isUnavailable && (
                    <View style={styles.productButtonBox}>
                      {!shouldShowAndroidExternalSupport && (
                        <Text style={styles.stateText}>{t('support.unavailable')}</Text>
                      )}

                      {shouldShowAndroidExternalSupport && (
                        <Pressable
                          style={styles.productButton}
                          onPress={handleOpenExternalSupport}
                        >
                          <Text style={styles.productButtonText}>{t('common.support')}</Text>
                        </Pressable>
                      )}

                      {!shouldShowAndroidExternalSupport && (
                        <Pressable
                          style={[styles.productButton, styles.productButtonClose]}
                          onPress={onClose}
                        >
                          <Text style={styles.productButtonText}>{t('common.close')}</Text>
                        </Pressable>
                      )}
                    </View>
                  )}

                  {!isLoading && !isUnavailable && (
                    <View style={styles.productButtonBox}>
                      {isShowingFutureDevelopment && (
                        <Pressable
                          style={[
                            styles.productButton,
                            styles.productButtonBack,
                          ]}
                          onPress={() => {
                            setIsShowingFutureDevelopment(false);
                          }}
                        >
                          <Text style={styles.productButtonText}>{t('common.goBack')}</Text>
                        </Pressable>
                      )}

                      {visibleProducts.map((product) => (
                        <Pressable
                          key={product.id}
                          style={[
                            styles.productButton,
                            product.tier === 'standard' && styles.productButtonWithIcon,
                            product.tier === 'future' && styles.productButtonFuture,
                            product.isDisabled && styles.productButtonDisabled,
                          ]}
                          onPress={() => {
                            onPurchase(product.id);
                          }}
                          disabled={product.isDisabled}
                        >
                          {product.tier === 'standard' && (
                            <View style={[
                              styles.productButtonIcon,
                              product.isDisabled && styles.productButtonIconDisabled,
                            ]}>
                              {product.id === SUPPORT_PRODUCT_CONFIGS[0].id && (
                                <HeartIcon fill={theme.text.primary} />
                              )}

                              {product.id === SUPPORT_PRODUCT_CONFIGS[1].id && (
                                <CoffeeIcon fill={theme.text.primary} />
                              )}

                              {product.id === SUPPORT_PRODUCT_CONFIGS[2].id && (
                                <StarIcon fill={theme.text.primary} />
                              )}
                            </View>
                          )}

                          <Text style={[
                            styles.productButtonText,
                            product.tier === 'future' && styles.productButtonTextFuture,
                            product.isDisabled && styles.productButtonTextDisabled,
                          ]}>{product.label}</Text>

                          <View style={styles.productButtonPriceBox}>
                            <Text style={[
                              styles.productButtonPrice,
                              product.isDisabled && styles.productButtonPriceDisabled,
                              product.tier === 'future' && styles.productButtonPriceFuture
                            ]}>
                              {product.price ? product.price : t('support.purchased')}
                            </Text>

                            {product.isDisabled && (
                              <HeartIconSmall
                                fill={product.tier === 'future' ? theme.text.warning : theme.text.primary}
                                style={styles.productButtonHeartIcon}
                                width={10}
                                height={8}
                              />
                            )}
                          </View>
                        </Pressable>
                      ))}

                      {!isShowingFutureDevelopment && (
                        <Pressable
                          style={styles.productButton}
                          onPress={() => {
                            setIsShowingFutureDevelopment(true);
                          }}
                        >
                          <Text style={styles.productButtonText}>{t('support.futureDevelopment')}</Text>
                        </Pressable>
                      )}
                    </View>
                  )}

                  {SUPPORT_IAP_DEBUG_ENABLED && (
                    <SupportIapDebug debugInfo={debugInfo} />
                  )}

                </View>

                <View style={styles.pad} />
              </View>
            </View>
          </KeyboardAvoidingView>
          </View>
        </ImageBackground>
      </Animated.View>
    </Modal>
  );
}

function createStyles(theme: UiTheme) {
  return StyleSheet.create({
    backgroundImage: {
      flex: 1,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.overlay.medium,
    },
    safeArea: {
      flex: 1,
    },
    modalBg: {
      flex: 1,
      backgroundColor: theme.overlay.medium,
    },
    modalContent: {
      minHeight: '100%',
      maxHeight: '100%',
    },
    modalContentFuture: {},
    header: {
      width: '100%',
      maxWidth: 305,
      marginHorizontal: 'auto',
      minHeight: 90,
    },
    pad: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    title: {
      fontSize: 16,
      color: theme.text.primary,
      textAlign: 'center',
    },
    cancelButton: {
      width: 50,
      height: 50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      paddingBottom: 90,
    },
    contentFuture: {},
    descriptionText: {
      fontSize: 16,
      lineHeight: 20,
      color: theme.text.primary,
      marginBottom: 16,
      textAlign: 'center',
    },
    productButtonBox: {
      width: '100%',
      maxWidth: 295,
      margin: 'auto',
      gap: 20,
    },
    productButton: {
      minHeight: 50,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      paddingVertical: 5,
      paddingHorizontal: 15,
      gap: 5,
      borderRadius: 25,
      backgroundColor: theme.surface.button.subtle,
    },
    productButtonBack: {
      backgroundColor: theme.surface.button.subtleWeak,
    },
    productButtonClose: {
      justifyContent: 'center',
    },
    productButtonFuture: {},
    productButtonIcon: {
      width: 30,
      height: 30,
      position: 'absolute',
      top: 10,
      bottom: 5,
      left: 10,
    },
    productButtonIconDisabled: {
      opacity: 0.5,
    },
    productButtonWithIcon: {
      paddingInline: 45,
    },
    productButtonDisabled: {
      backgroundColor: theme.surface.button.subtleWeaker,
    },
    productButtonText: {
      textAlign: 'center',
      fontSize: 15,
      lineHeight: 15,
      color: theme.text.primary,
      width: '100%',
    },
    productButtonTextDisabled: {
      color: theme.text.helper,
    },
    productButtonTextFuture: {
      marginLeft: 0,
    },
    productButtonPriceBox: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 4,
    },
    productButtonPrice: {
      fontSize: 15,
      lineHeight: 15,
      fontWeight: 'bold',
      color: theme.text.primary,
    },
    productButtonPriceDisabled: {
      fontWeight: 'regular',
    },
    productButtonPriceFuture: {
      color: theme.text.warning,
    },
    productButtonHeartIcon: {
      width: 10,
      height: 12,
    },
    stateText: {
      fontSize: theme.typography.body.fontSize,
      lineHeight: 20,
      color: theme.text.primary,
      marginBottom: 8,
      textAlign: 'center',
    },
    debugBox: {
      width: '100%',
      maxWidth: 320,
      marginTop: 20,
      marginHorizontal: 'auto',
      padding: 12,
      borderRadius: theme.radius.md,
      backgroundColor: theme.surface.fieldStrong,
      gap: 8,
    },
    debugTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.text.primary,
    },
    debugMetaText: {
      fontSize: 12,
      color: theme.text.secondary,
      marginBottom: 8,
    },
    debugSectionTitle: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.text.primary,
      marginBottom: 4,
    },
    debugErrorText: {
      fontSize: 12,
      color: theme.text.warning,
      marginBottom: 8,
    },
    debugScroll: {
      maxHeight: 220,
    },
    debugScrollContent: {
      paddingBottom: 4,
    },
    debugText: {
      fontSize: 11,
      lineHeight: 15,
      color: theme.text.primary,
    },
  });
}
