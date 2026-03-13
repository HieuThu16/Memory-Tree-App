import type { SupabaseClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { parseAuthCallback } from "../lib/authCallback";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({
  supabase,
}: {
  supabase: SupabaseClient;
}) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<"google" | "magic" | null>(null);

  const isExpoGo = Constants.executionEnvironment === "storeClient";

  // Create a consistent redirect URI
  const redirectTo = makeRedirectUri({
    scheme: "memorytree",
    path: "auth/callback",
    // In Expo Go, it will try exp://... or memorytree:// if configured
    // In APK/Production, it will use memorytree://
  });

  const handleGoogle = async () => {
    setMessage(null);
    setLoading("google");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(null);
      return;
    }

    if (!data.url) {
      setMessage("Không tạo được URL đăng nhập Google.");
      setLoading(null);
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectTo,
      isExpoGo ? { showInRecents: true } : undefined,
    );

    if (result.type === "success" && result.url) {
      const callback = parseAuthCallback(result.url);

      if (!callback) {
        setMessage("Không lấy được dữ liệu đăng nhập từ callback của MAP.");
      } else if (callback.type === "code") {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(callback.code);
        if (exchangeError) {
          setMessage(exchangeError.message);
        }
      } else {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: callback.accessToken,
          refresh_token: callback.refreshToken,
        });

        if (sessionError) {
          setMessage(sessionError.message);
        }
      }
    }

    setLoading(null);
  };

  const handleMagicLink = async () => {
    if (!email.includes("@")) {
      setMessage("Vui lòng nhập email hợp lệ.");
      return;
    }

    setMessage(null);
    setLoading("magic");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    setMessage(
      error
        ? error.message
        : "Đã gửi magic link. Hãy mở email trên điện thoại.",
    );
    setLoading(null);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>MAP</Text>
        <Text style={styles.title}>Đăng nhập app MAP</Text>
        <Text style={styles.supportText}>
          Đăng nhập xong sẽ quay lại giao diện app MAP trên điện thoại, không về
          web Vercel.
        </Text>

        <Pressable
          onPress={() => {
            void handleGoogle();
          }}
          style={[styles.primaryButton, loading ? styles.buttonDisabled : null]}
        >
          {loading === "google" ? (
            <ActivityIndicator color="#07111f" />
          ) : (
            <Text style={styles.primaryButtonText}>Đăng nhập với Google</Text>
          )}
        </Pressable>

        <Text style={styles.divider}>hoac</Text>

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="email cua ban"
          placeholderTextColor="#6f8898"
          style={styles.input}
          value={email}
        />

        <Pressable
          onPress={() => {
            void handleMagicLink();
          }}
          style={[
            styles.secondaryButton,
            loading === "magic" ? styles.buttonDisabled : null,
          ]}
        >
          {loading === "magic" ? (
            <ActivityIndicator color="#ecf3fb" />
          ) : (
            <Text style={styles.secondaryButtonText}>Gửi Magic Link</Text>
          )}
        </Pressable>

        {message ? <Text style={styles.statusText}>{message}</Text> : null}

        <View style={styles.debugBox}>
          <Text style={styles.debugTitle}>Debug Redirect URI:</Text>
          <Text style={styles.debugUri} selectable={true}>
            {redirectTo}
          </Text>
          <Text style={styles.debugNote}>
            Copy URL trên vào phần "Redirect URLs" trong Supabase Dashboard nếu
            login xong bị nhảy về web.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#07111f",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#10233b",
    borderRadius: 28,
    padding: 24,
    gap: 16,
  },
  eyebrow: {
    color: "#79d8ff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    color: "#ecf3fb",
    fontSize: 30,
    fontWeight: "800",
  },
  supportText: {
    color: "#a7bfd1",
    fontSize: 15,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: "#79d8ff",
    borderRadius: 18,
    minHeight: 54,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: "#07111f",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    backgroundColor: "#17304d",
    borderRadius: 18,
    minHeight: 54,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: "#ecf3fb",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  divider: {
    color: "#6f8898",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#0c1b2d",
    borderColor: "#27435f",
    borderRadius: 16,
    borderWidth: 1,
    color: "#ecf3fb",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  statusText: {
    color: "#dee9f3",
    fontSize: 14,
    lineHeight: 20,
  },
  debugBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: "#05101c",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1a344e",
    gap: 6,
  },
  debugTitle: {
    color: "#79d8ff",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  debugUri: {
    color: "#a7bfd1",
    fontSize: 10,
    fontFamily: "monospace",
  },
  debugNote: {
    color: "#6f8898",
    fontSize: 10,
    fontStyle: "italic",
  },
});
