import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { DetailScreenShell, useDetailScreenStyles } from '@/components/detail-screen-shell';
import { DetailPrimaryButton, DetailTextArea, DetailTextField, detailFormStyles } from '@/components/detail-form';
import { useI18n } from '@/hooks/use-i18n';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ContactScreen() {
  const detailScreenStyles = useDetailScreenStyles();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [wasSubmitted, setWasSubmitted] = useState(false);

  const canSend = useMemo(() => {
    return isValidEmail(email) && message.trim().length > 0;
  }, [email, message]);

  const handleSend = () => {
    if (!canSend) {
      return;
    }

    setWasSubmitted(true);
    setEmail('');
    setMessage('');
  };

  return (
    <DetailScreenShell
      title={t('contact.title')}
      subtitle={t('contact.subtitle')}
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <View style={detailFormStyles.fieldBlock}>
          <DetailTextField
            placeholder={t('contact.emailPlaceholder')}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setWasSubmitted(false);
            }}
            autoCorrect={false}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={detailFormStyles.fieldBlock}>
          <DetailTextArea
            placeholder={t('contact.messagePlaceholder')}
            value={message}
            onChangeText={(value) => {
              setMessage(value);
              setWasSubmitted(false);
            }}
          />
        </View>

        {!canSend && (
          <Text style={detailScreenStyles.helperText}>
            {t('contact.validation')}
          </Text>
        )}

        {wasSubmitted && (
          <Text style={detailScreenStyles.successText}>
            {t('contact.submitted')}
          </Text>
        )}

        <DetailPrimaryButton
          label={t('common.send')}
          onPress={handleSend}
          disabled={!canSend}
        />
      </View>
    </DetailScreenShell>
  );
}
