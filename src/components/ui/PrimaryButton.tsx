import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { palette } from '@/theme/palette';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
  textStyle,
}: PrimaryButtonProps) {
  const getButtonStyle = () => {
    const baseStyle = [styles.button];
    
    // Add size styles
    if (size === 'sm') baseStyle.push(styles.buttonSm);
    else if (size === 'lg') baseStyle.push(styles.buttonLg);
    else baseStyle.push(styles.buttonMd);
    
    // Add variant styles
    if (variant === 'primary') baseStyle.push(styles.buttonPrimary);
    else if (variant === 'secondary') baseStyle.push(styles.buttonSecondary);
    else if (variant === 'ghost') baseStyle.push(styles.buttonGhost);
    
    if (disabled) baseStyle.push(styles.buttonDisabled);
    
    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text];
    
    // Add size styles
    if (size === 'sm') baseStyle.push(styles.textSm);
    else if (size === 'lg') baseStyle.push(styles.textLg);
    else baseStyle.push(styles.textMd);
    
    // Add variant styles
    if (variant === 'primary') baseStyle.push(styles.textPrimary);
    else if (variant === 'secondary') baseStyle.push(styles.textSecondary);
    else if (variant === 'ghost') baseStyle.push(styles.textGhost);
    
    if (disabled) baseStyle.push(styles.textDisabled);
    
    return baseStyle;
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        ...getButtonStyle(),
        pressed && !disabled && styles.buttonPressed,
        style,
      ]}
    >
      <Text style={[...getTextStyle(), textStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  buttonSm: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  buttonMd: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonLg: {
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  buttonPrimary: {
    backgroundColor: palette.neonPurple,
  },
  buttonSecondary: {
    backgroundColor: palette.bgButton,
    borderWidth: 1,
    borderColor: palette.borderActive,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  textSm: {
    fontSize: 12,
  },
  textMd: {
    fontSize: 14,
  },
  textLg: {
    fontSize: 16,
  },
  textPrimary: {
    color: palette.white,
  },
  textSecondary: {
    color: palette.white,
  },
  textGhost: {
    color: palette.neonPurple,
  },
  textDisabled: {
    color: palette.textMuted,
  },
});
