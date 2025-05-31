
import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Platform,
  NativeSyntheticEvent,
  TextInputContentSizeChangeEventData,
} from 'react-native';
import { Animated, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

interface AutoResizingInputProps {
  onSend?: (text: string) => void;
  placeholder?: string;
  minHeight?: number; // Added to retain original flexibility
  maxHeight?: number; // Added to retain original flexibility
}

const AutoResizingInput: React.FC<AutoResizingInputProps> = ({
  onSend,
  placeholder = 'Type your message...',
  minHeight = 20, // Default from original props if not provided
  maxHeight = 200, // Default from original props if not provided
}) => {
  const [text, setText] = useState('');
  const [inputHeight, setInputHeight] = useState(minHeight);
  const inputRef = useRef<TextInput>(null);

  const animationProgress = useRef(new Animated.Value(0)).current;

  const handleSend = () => {
    if (text.trim()) {
      onSend?.(text.trim());
      setText('');
      setInputHeight(minHeight); // Reset to minHeight

      Animated.sequence([
        Animated.spring(animationProgress, { toValue: 1, useNativeDriver: true, friction: 5 }),
        Animated.spring(animationProgress, { toValue: 0, useNativeDriver: true, friction: 5 }),
      ]).start();
    }
  };

  const handleTextChange = (newText: string) => {
    setText(newText);
    // Use onContentSizeChange for more accurate height calculation if available
  };

  // More robust height calculation using onContentSizeChange
  const onContentSizeChange = (
    event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>,
  ) => {
    const { height } = event.nativeEvent.contentSize;
    const newHeight = Math.max(minHeight, Math.min(height, maxHeight));
    setInputHeight(newHeight);
  };


  const handleKeyPress = (e: any) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputContainerPress = () => {
    inputRef.current?.focus();
  };

  // Adjusted container height calculation
  const calculatedContainerHeight = inputHeight + (Platform.OS === 'web' ? 60 : 70); // More padding for icons

  const animatedContainerStyle = {
    transform: [
      {
        scale: animationProgress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] }),
      },
    ],
    height: calculatedContainerHeight,
  } as any;

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.container, animatedContainerStyle]}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleInputContainerPress}
          style={styles.inputTouchArea}>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={handleTextChange}
            onContentSizeChange={onContentSizeChange} // Use this for dynamic height
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
            style={[{
              fontSize: 16,
              lineHeight: 20,
              color: '#FFFFFF',
              height: inputHeight,
              paddingTop: Platform.OS === 'ios' ? 4 : 0,
              ...(Platform.OS === 'android' && {
                marginTop: 4,
              }),
              ...(Platform.OS === 'web' && {
                outline: 'none',
                border: 'none',
                height: inputHeight + 15,
              }),
            }]}
          />
        </TouchableOpacity>

        <View style={styles.actionRow}>
          <View style={styles.iconRow}>
            <TouchableOpacity style={styles.iconButton}>
              <MaterialIcons name="attach-file" size={22} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="rocket-outline" size={22} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <MaterialIcons name="auto-awesome" size={22} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <MaterialIcons name="science" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={handleSend}
            disabled={!text.trim()}
            style={[styles.sendButton, !text.trim() ? styles.sendDisabled : styles.sendEnabled]}>
            <MaterialIcons
              name="play-arrow"
              size={24}
              color={text.trim() ? '#000000' : '#9CA3AF'}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 24, paddingTop: 4 },
  container: { overflow: 'hidden', borderRadius: 16, borderWidth: 1, borderColor: '#3f3f46', backgroundColor: '#18181b' },
  inputTouchArea: { marginTop: 4, flex: 1, paddingHorizontal: 24, paddingTop: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, paddingTop: 8 },
  iconRow: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { marginRight: 16, padding: 4 },
  sendButton: { height: 40, width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  sendEnabled: { backgroundColor: '#ffffff' },
  sendDisabled: { backgroundColor: '#3f3f46' },
});

export default AutoResizingInput; 