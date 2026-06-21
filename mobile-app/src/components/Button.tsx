import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ViewStyle,
  TextStyle
} from 'react-native';
import { COLORS } from '../utils/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'normal' | 'small' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'normal',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const getButtonStyles = () => {
    const baseStyle: any[] = [styles.button];
    
    // Variant styles
    if (variant === 'primary') baseStyle.push(styles.primary);
    else if (variant === 'secondary') baseStyle.push(styles.secondary);
    else if (variant === 'danger') baseStyle.push(styles.danger);
    else if (variant === 'outline') baseStyle.push(styles.outline);

    // Size styles
    if (size === 'small') baseStyle.push(styles.small);
    else if (size === 'large') baseStyle.push(styles.large);

    // State styles
    if (disabled || loading) baseStyle.push(styles.disabled);

    return baseStyle;
  };

  const getTextColor = () => {
    if (disabled || loading) return COLORS.textMuted;
    if (variant === 'outline') return COLORS.secondary;
    if (variant === 'danger') return COLORS.danger;
    if (variant === 'primary') return COLORS.textDark;
    return COLORS.text;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyles(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  primary: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  secondary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  danger: {
    backgroundColor: 'transparent',
    borderColor: COLORS.danger,
    borderWidth: 1.5,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: COLORS.secondary,
    borderWidth: 1.5,
  },
  disabled: {
    backgroundColor: COLORS.surfaceDark,
    borderColor: COLORS.border,
    opacity: 0.5,
  },
  normal: {
    paddingVertical: 13,
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  large: {
    paddingVertical: 16,
    borderRadius: 12,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
export default Button;
