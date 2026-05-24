import { StyleSheet, Text } from 'react-native';
import { colors } from '../theme/colors';

export function ErrorText({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <Text style={styles.text}>{message}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: colors.danger,
    fontSize: 14,
    letterSpacing: 0,
  },
});
