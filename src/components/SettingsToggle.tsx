import React, { useEffect, useRef } from "react";
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useTheme } from "./theme";

export function SettingsToggle({
  open,
  onPress,
}: {
  open: boolean;
  onPress: () => void;
}) {
  const { styles } = useTheme(),
    progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!active) return;
      if (reduce) progress.setValue(open ? 1 : 0);
      else
        Animated.timing(progress, {
          toValue: open ? 1 : 0,
          duration: 180,
          useNativeDriver: Platform.OS !== "web",
        }).start();
    });
    return () => {
      active = false;
      progress.stopAnimation();
    };
  }, [open, progress]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={open ? "Cerrar ajustes" : "Abrir ajustes"}
      aria-expanded={open}
      onPress={onPress}
      style={[
        styles.chip,
        {
          width: 48,
          height: 48,
          padding: 0,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 24,
        },
      ]}
    >
      <Animated.View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{
          position: "absolute",
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0],
          }),
          transform: [
            {
              rotate: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ["0deg", "45deg"],
              }),
            },
          ],
        }}
      >
        <View style={{ width: 28, height: 28 }} aria-hidden>
          {Array.from({ length: 8 }, (_, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                width: 28,
                height: 28,
                transform: [{ rotate: `${i * 45}deg` }],
              }}
            >
              <View
                style={{
                  position: "absolute",
                  left: 12,
                  top: 0,
                  width: 4,
                  height: 6,
                  borderRadius: 1,
                  backgroundColor: styles.cardTitle.color,
                }}
              />
            </View>
          ))}
          <View
            style={{
              position: "absolute",
              left: 5,
              top: 5,
              width: 18,
              height: 18,
              borderRadius: 9,
              borderWidth: 2.5,
              borderColor: styles.cardTitle.color,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: styles.chip.backgroundColor,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderWidth: 1.5,
                borderRadius: 3,
                borderColor: styles.cardTitle.color,
              }}
            />
          </View>
        </View>
      </Animated.View>
      <Animated.View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{
          position: "absolute",
          opacity: progress,
          transform: [
            {
              rotate: progress.interpolate({
                inputRange: [0, 1],
                outputRange: ["-45deg", "0deg"],
              }),
            },
          ],
        }}
      >
        <Text style={[styles.cardTitle, { fontSize: 28 }]} aria-hidden>
          ×
        </Text>
      </Animated.View>
    </Pressable>
  );
}
