import { ReactNode } from 'react';
import { TextInput, TextInputProps, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface TextFieldProps extends TextInputProps {
  label: string;
  rightElement?: ReactNode;
}

export function TextField({ label, rightElement, ...props }: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          {...props}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, rightElement ? styles.inputWithRight : null, props.style]}
        />
        {rightElement ? <View style={styles.rightElement}>{rightElement}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
  },
  inputWrap: {
    position: 'relative',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 15,
    letterSpacing: 0,
  },
  inputWithRight: {
    paddingRight: 48,
  },
  rightElement: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
