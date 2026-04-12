/**
 * Root index — shown at "/" while _layout.js fires the auth redirect.
 *
 * Without this file, the Stack at "/" renders a blank white screen for one
 * frame before the useEffect redirect in _layout.js fires.  This component
 * fills that gap with the same indigo loading spinner the user saw during
 * session restore, so the transition is seamless.
 */
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#4f46e5',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ActivityIndicator color="white" size="large" />
    </View>
  );
}
