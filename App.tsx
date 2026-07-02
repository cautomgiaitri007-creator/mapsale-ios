import React, { useRef, useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, ActivityIndicator, SafeAreaView, StatusBar, Alert, Linking, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as AppleAuthentication from 'expo-apple-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REPORT_EMAIL = 'cautomgiaitri007@gmail.com';
const BASE_URL = 'https://near-swap-go.base44.app';

const INJECTED_JS = `
(function() {
if (window.__mapsaleUGC) return;
window.__mapsaleUGC = true;
var btn = document.createElement('button');
btn.textContent = '\u26D1 Report';
btn.style.cssText = 'position:fixed;bottom:80px;right:16px;z-index:2147483647;background:rgba(220,53,69,0.88);color:#fff;border:none;border-radius:20px;padding:8px 18px;font-size:14px;font-weight:bold;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.25);display:none;';
btn.onclick = function(e) { e.preventDefault(); window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({type:'REPORT',url:window.location.href,title:document.title})); };
document.body&&document.body.appendChild(btn);
function update(){var url=window.location.href;var hide=url.includes('/login')||url.includes('/signup')||url.includes('/register')||url==='https://near-swap-go.base44.app'||url==='https://near-swap-go.base44.app/';btn.style.display=hide?'none':'block';}
update();var last=location.href;setInterval(function(){if(location.href!==last){last=location.href;update();}},600);
})();true;
`;

export default function App() {
const webViewRef = useRef(null);
const [loading, setLoading] = useState(true);
const [currentUrl, setCurrentUrl] = useState(BASE_URL);
const [appleAvailable, setAppleAvailable] = useState(false);
useEffect(()=>{AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(()=>{});}, []);
const isLoginPage=(url)=>url===BASE_URL||url===BASE_URL+'/'||url.includes('/login')||url.includes('/signin');
const showSIWA=appleAvailable&&isLoginPage(currentUrl);
const onNavChange=useCallback((s)=>{setCurrentUrl(s.url||BASE_URL);},[]);
const onShouldLoad=useCallback(()=>{ return true; },[]);
const onMessage=useCallback((event)=>{try{const d=JSON.parse(event.nativeEvent.data);if(d.type==='REPORT'){Alert.alert('Report Content','What would you like to do?',[{text:'Cancel',style:'cancel'},{text:'Block User',style:'destructive',onPress:()=>Linking.openURL('mailto:'+REPORT_EMAIL+'?subject='+encodeURIComponent('MapSale - Block User')+'&body='+encodeURIComponent('Block user\n\nPage: '+d.url))},{text:'Report Content',onPress:()=>Linking.openURL('mailto:'+REPORT_EMAIL+'?subject='+encodeURIComponent('MapSale - Report Objectionable Content')+'&body='+encodeURIComponent('Content report\n\nPage: '+d.url+'\nTitle: '+d.title+'\n\nReason: '))}]);}}catch(_){}},[]);
const handleAppleSignIn=useCallback(async()=>{try{const c=await AppleAuthentication.signInAsync({requestedScopes:[AppleAuthentication.AppleAuthenticationScope.FULL_NAME,AppleAuthentication.AppleAuthenticationScope.EMAIL]});const userId=c.user;let email=c.email;if(email)await AsyncStorage.setItem('apple_email_'+userId,email);else email=await AsyncStorage.getItem('apple_email_'+userId);if(!email){Alert.alert('Sign In','Could not retrieve your Apple email. Please try again.');return;}const password='Apple@'+userId.slice(-14);const js=`(function(){var d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value');function fill(sel,val){var el=document.querySelector(sel);if(!el)return false;d.set.call(el,val);['input','change','blur'].forEach(function(e){el.dispatchEvent(new Event(e,{bubbles:true}));});return true;}var ok=fill('input[type="email"],input[name="email"],input[placeholder*="mail" i],input[autocomplete="email"]',${JSON.stringify(email)});if(ok){fill('input[type="password"],input[name="password"],input[autocomplete="current-password"]',${JSON.stringify(password)});setTimeout(function(){var btn=document.querySelector('button[type="submit"],form button:last-of-type');if(btn)btn.click();},400);}})();true;`;webViewRef.current&&webViewRef.current.injectJavaScript(js);}catch(err){if(err.code!=='ERR_CANCELED')Alert.alert('Sign In Error','Apple Sign In failed. Please try again.');}},[]);
const siwaBottom=Platform.isPad?160:90;
return (<SafeAreaView style={styles.container}><StatusBar barStyle="dark-content" backgroundColor="#ffffff"/><WebView ref={webViewRef} source={{uri:BASE_URL}} style={styles.webview} onLoadStart={()=>setLoading(true)} onLoadEnd={()=>setLoading(false)} onNavigationStateChange={onNavChange} onShouldStartLoadWithRequest={onShouldLoad} onMessage={onMessage} injectedJavaScript={INJECTED_JS} geolocationEnabled={true} javaScriptEnabled={true} domStorageEnabled={true} allowsInlineMediaPlayback={true} allowsBackForwardNavigationGestures={true} pullToRefreshEnabled={true} sharedCookiesEnabled={true} thirdPartyCookiesEnabled={true} userAgent="MapSale/1.0 (iOS)"/>{loading&&(<View style={styles.loadingOverlay}><ActivityIndicator size="large" color="#FF6B35"/></View>)}{showSIWA&&(<View style={[styles.siwaWrapper,{bottom:siwaBottom}]}><AppleAuthentication.AppleAuthenticationButton buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN} buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK} cornerRadius={8} style={styles.siwaBtn} onPress={handleAppleSignIn}/></View>)}</SafeAreaView>);
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:'#ffffff'},webview:{flex:1},loadingOverlay:{...StyleSheet.absoluteFillObject,justifyContent:'center',alignItems:'center',backgroundColor:'rgba(255,255,255,0.85)'},siwaWrapper:{position:'absolute',left:24,right:24,alignItems:'center'},siwaBtn:{width:'100%',height:52}});
