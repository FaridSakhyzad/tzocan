import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ContactScreen() {
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
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title}>Contact</Text>
        <Text style={styles.subtitle}>
          Send feedback, report a bug, or share an idea for the app.
        </Text>
      </View>

      <View style={styles.formSection}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
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

        <View style={styles.textAreaContainer}>
          <TextInput
            style={styles.textArea}
            placeholder="Message..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={message}
            onChangeText={(value) => {
              setMessage(value);
              setWasSubmitted(false);
            }}
            multiline
            textAlignVertical="top"
          />
        </View>

        {!canSend && (
          <Text style={styles.helperText}>
            Enter a valid email and a message to enable sending.
          </Text>
        )}

        {wasSubmitted && (
          <Text style={styles.successText}>
            Message drafted. Hook up a backend later to send it for real.
          </Text>
        )}

        <Pressable
          style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 18,
  },
  title: {
    fontSize: 31,
    lineHeight: 37,
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  formSection: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#ffffff',
  },
  textAreaContainer: {
    marginBottom: 12,
  },
  textArea: {
    minHeight: 180,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 1)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: '#ffffff',
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255, 255, 255, 0.55)',
    marginBottom: 12,
  },
  successText: {
    fontSize: 13,
    lineHeight: 18,
    color: 'rgba(255, 255, 204, 1)',
    marginBottom: 12,
  },
  sendButton: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  sendButtonText: {
    color: 'rgba(62, 63, 86, 1)',
    fontSize: 16,
    fontWeight: '600',
  },
});
