import { ScrollView, StyleSheet, Text, View } from 'react-native';

export default function AboutScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>About</Text>
        <Text style={styles.subtitle}>
          A short note about the app.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.card}>
          <Text style={styles.bodyText}>Lorem ipsum dolor</Text>
        </View>
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
  section: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: 'rgba(74, 75, 99, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#d4d6df',
  },
});
