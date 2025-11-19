// screens/sso-callback.tsx

import { useEffect } from 'react';
import { View } from 'react-native';

export default function SSOCallback() {
  useEffect(() => {
    console.log("SSO callback recebido.");
  }, []);

  return <View style={{ flex: 1, backgroundColor: '#fff' }} />;
}
