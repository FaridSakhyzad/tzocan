import { useMemo, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import * as MailComposer from 'expo-mail-composer';

import { DetailScreenShell, useDetailScreenStyles } from '@/components/detail-screen-shell';
import { DetailPrimaryButton, DetailTextArea, DetailTextField, detailFormStyles } from '@/components/detail-form';
import { CONTACT_EMAIL } from '@/constants/app-config';
import { useI18n } from '@/hooks/use-i18n';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function buildMailtoUrl(email: string, subject: string, body: string) {
  const query = [
    `subject=${encodeURIComponent(subject)}`,
    `body=${encodeURIComponent(body)}`,
  ].join('&');

  return `mailto:${encodeURIComponent(email)}?${query}`;
}

export default function ContactScreen() {
  const detailScreenStyles = useDetailScreenStyles();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const canSend = useMemo(() => {
    return isValidEmail(email) && message.trim().length > 0;
  }, [email, message]);

  const handleSend = async () => {
    if (!canSend) {
      return;
    }

    if (!CONTACT_EMAIL) {
      setSubmitError(t('contact.configMissing'));
      setWasSubmitted(false);
      return;
    }

    setIsSending(true);
    setSubmitError(null);

    try {
      const subject = t('contact.subject');
      const body = [`From: ${email.trim()}`, '', message.trim()].join('\n');
      const isAvailable = await MailComposer.isAvailableAsync();

      if (isAvailable) {
        const result = await MailComposer.composeAsync({
          recipients: [CONTACT_EMAIL],
          subject,
          body,
        });

        if (
          result.status === MailComposer.MailComposerStatus.SENT ||
          result.status === MailComposer.MailComposerStatus.SAVED
        ) {
          setWasSubmitted(true);
          setEmail('');
          setMessage('');
        } else {
          setWasSubmitted(false);
        }
      } else {
        const mailtoUrl = buildMailtoUrl(CONTACT_EMAIL, subject, body);
        const canOpenMailto = await Linking.canOpenURL(mailtoUrl);

        if (!canOpenMailto) {
          setSubmitError(t('contact.unavailable'));
          setWasSubmitted(false);
          return;
        }

        await Linking.openURL(mailtoUrl);
        setWasSubmitted(false);
      }
    } catch {
      setSubmitError(t('contact.failed'));
      setWasSubmitted(false);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <DetailScreenShell
      title={t('contact.title')}
      subtitle={t('contact.subtitle')}
      keyboardShouldPersistTaps="handled"
    >
      <View style={detailScreenStyles.contactSection}>
        <View style={detailFormStyles.fieldBlock}>
          <DetailTextField
            placeholder={t('contact.emailPlaceholder')}
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setWasSubmitted(false);
              setSubmitError(null);
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
              setSubmitError(null);
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

        {submitError && (
          <Text style={detailScreenStyles.helperText}>
            {submitError}
          </Text>
        )}

        <DetailPrimaryButton
          label={t('common.send')}
          loading={isSending}
          onPress={handleSend}
          disabled={!canSend || isSending}
        />
      </View>
    </DetailScreenShell>
  );
}
