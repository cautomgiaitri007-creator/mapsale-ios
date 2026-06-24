import React, { useRef, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, SafeAreaView, StatusBar } from 'react-native';
import { WebView } from 'react-native-webview';
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const APP_ID = '6a335331541f2b6ace468ab1';
const API_BASE = `https://near-swap-go.base44.app/api/apps/${APP_ID}`;

function getApplePassword(appleUserId: string): string {
  return 'Apple@' + appleUserId.slice(-14);
}

export default function App() {
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [showAppleButton, setShowAppleButton] = useState(false);

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { user: appleUserId, email: appleEmail, fullName } = credential;

      let email = appleEmail;
      if (!email) {
        email = await AsyncStorage.getItem('apple_email_' + appleUserId);
      } else {
        await AsyncStorage.setItem('apple_email_' + appleUserId, email);
      }

      if (!email) return;

      const password = getApplePassword(appleUserId);
      const name = fullName?.givenName || email.split('@')[0];

      let token: string | null = null;

      // Try login first
      const loginResp = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (loginResp.ok) {
        const loginData = await loginResp.json();
        token = loginData.access_token || loginData.token;
      } else {
        // Register new user then login
        const regResp = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, full_name: name }),
        });
        if (regResp.ok) {
          const loginResp2 = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          if (loginResp2.ok) {
            const d = await loginResp2.json();
            token = d.access_token || d.token;
          }
        }
      }

      if (token) {
        const escapedToken = JSON.stringify(token);
        webViewRef.current?.injectJavaScript(`
          (function() {
            var t = ${escapedToken};
            localStorage.setItem('base44_access_token', t);
            localStorage.setItem('token', t);
            window.location.href = '/';
          })();
          true;
        `);
      }
    } catch (e: any) {
      if (e.code !== 'ERR_CANCELED') console.error('Apple Sign In error:', e);
    }
  };

  const onNavigationStateChange = (navState: any) => {
    setShowAppleButton(navState.url.includes('/login'));
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <WebView
        ref={webViewRef}
        source={{ uri: 'https://near-swap-go.base44.app' }}
        style={styles.webview}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onNavigationStateChange={onNavigationStateChange}
        geolocationEnabled={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        allowsBackForwardNavigationGestures={true}
        pullToRefreshEnabled={true}
        sharedCookiesEnabled={true}
        thirdPartyCookiesEnabled={true}
        userAgent="MapSale/1.0 (iOS)"
      />
      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      )}
      {showAppleButton && (
        <View style={styles.appleButtonContainer}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={5}
            style={styles.appleButton}
            onPress={handleAppleSignIn}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  webview: { flex: 1 },
  loading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.8)',
  },
  appleButtonContainer: {
    position: 'absolute',
    bottom: 170,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  appleButton: {
    width: '100%',
    height: 50,
  },
});
