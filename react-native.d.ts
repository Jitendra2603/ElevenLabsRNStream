// src/types/react-native.d.ts
import 'react-native';

declare module 'react-native' {
  interface ViewProps            { className?: string }
  interface TextProps            { className?: string }
  interface TouchableOpacityProps{ className?: string }
  interface ImageProps           { className?: string }
}