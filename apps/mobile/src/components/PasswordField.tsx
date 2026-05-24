import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable } from 'react-native';
import { colors } from '../theme/colors';
import { TextField } from './TextField';

interface PasswordFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}

export function PasswordField({ label, value, onChangeText }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      label={label}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={!visible}
      autoCapitalize="none"
      rightElement={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Ocultar clave' : 'Mostrar clave'}
          onPress={() => setVisible((current) => !current)}
          hitSlop={10}
        >
          {visible ? <EyeOff color={colors.textMuted} size={22} /> : <Eye color={colors.textMuted} size={22} />}
        </Pressable>
      }
    />
  );
}
