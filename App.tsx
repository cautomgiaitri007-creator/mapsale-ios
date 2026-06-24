import React, { useRef, useState } from 'react';
import {
  StyleSheet, View, ActivityIndicator, SafeAreaView,
  StatusBar, Platform, Alert
} from 'react-native';
import { WebView } from 'react-native-webview';
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const APPLE_CREDS_KEY = 'apple_auth_creds_v1';

export default function App() {
  const webViewRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('https://near-swap-go.base44.app');
  const isLoginPage = currentUrl.includes('/login');

  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { email, fullName, user: appleUserId } = credential;

      let stored = await AsyncStorage.getItem(APPLE_CREDS_KEY);
      let creds: { email: string; password: string } | null = stored ? JSON.parse(stored) : null;

      if (!creds) {
        const userEmail = email || (appleUserId.substring(0, 10) + '@privaterelay.appleid.com');
        const password = 'Ap_' + appleUserId.substring(0, 14);
        creds = { email: userEmail, password };
        await AsyncStorage.setItem(APPLE_CREDS_KEY, JSON.stringify(creds));
      }

      const appleEmail = creds.email;
      const applePass = creds.password;

      const js = `(function() {
        var inputs = document.querySelectorAll('input');
        var eField, pField;
        inputs.forEach(function(i) {
          var t = (i.type||'').toLowerCase(), ph = (i.placeholder||'').toLowerCase();
          if (!eField && (t==='email'||t==='tel'||ph.includes('email')||ph.includes('phone')||ph.includes('mail')||ph.includes('so'))) eField=i;
          if (!pField && t==='password') pField=i;
        });
        function fill(el,val){
          if(!el)return;
          var s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
          s.set.call(el,val);
          el.dispatchEvent(new Event('input',{bubbles:true}));
          el.dispatchEvent(new Event('change',{bubbles:true}));
        }
        fill(eField,'` + appleEmail + `');
        fill(pField,'` + applePass + `');
        setTimeout(function(){
          var btns=document.querySelectorAll('button');
          for(var i=0;i<btns.length;i++){
            var t=(btns[i].textContent||'').toLowerCase();
            if(t.includes('log')||t.includes('sign')||t.includes('dang')){btns[i].click();break;}
          }
        },400);
      })()`;
      webViewRef.current?.injectJavaScript(js);
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign in with Apple', 'Could not complete. Please use email/password.');
      }
    }
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
        onNavigationStateChange={(nav) => setCurrentUrl(nav.url)}
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
      {isLoginPage && Platform.OS === 'ios' && (
        <View style={styles.appleContainer}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={8}
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
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  appleContainer: {
    position: 'absolute',
    bottom: 120,
    left: 24,
    right: 24,
    alignItems: 'center',
  },
  appleButton: {
    width: '100%',
    height: 52,
  },
});
