import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { DetailScreenShell, useDetailScreenStyles } from '@/components/detail-screen-shell';
import { DetailPrimaryButton, DetailTextArea, DetailTextField, detailFormStyles } from '@/components/detail-form';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ContactScreen() {
  const detailScreenStyles = useDetailScreenStyles();
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
      title="Contact"
      subtitle="Send feedback, report a bug, or share an idea for the app."
      keyboardShouldPersistTaps="handled"
    >
      <View>
        <View style={detailFormStyles.fieldBlock}>
          <DetailTextField
            placeholder="Email..."
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
            placeholder="Message..."
            value={message}
            onChangeText={(value) => {
              setMessage(value);
              setWasSubmitted(false);
            }}
          />
        </View>

        {!canSend && (
          <Text style={detailScreenStyles.helperText}>
            Enter a valid email and a message to enable sending.
          </Text>
        )}

        {wasSubmitted && (
          <Text style={detailScreenStyles.successText}>
            Message drafted. Hook up a backend later to send it for real.
          </Text>
        )}

        <DetailPrimaryButton
          label="Send"
          onPress={handleSend}
          disabled={!canSend}
        />
      </View>
    </DetailScreenShell>
  );
}
