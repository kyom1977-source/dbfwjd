// Flexible Firebase configuration with fallback support for Netlify and GitHub deployments

let loadedConfig: any = null;
try {
  // @ts-ignore
  loadedConfig = await import('../../firebase-applet-config.json');
  if (loadedConfig && loadedConfig.default) {
    loadedConfig = loadedConfig.default;
  }
} catch {
  // Fallback if JSON file is not present in build environment
}

export const firebaseConfig = {
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    loadedConfig?.projectId ||
    'kempt-tiger-b2ts5',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    loadedConfig?.appId ||
    '1:783967465946:web:3fd8c9f41f255a8043d0e3',
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    loadedConfig?.apiKey ||
    'AIzaSyAkn_e57lVoMt8qlq2WfklLuzZCrcPd7os',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    loadedConfig?.authDomain ||
    'kempt-tiger-b2ts5.firebaseapp.com',
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_DATABASE_ID ||
    loadedConfig?.firestoreDatabaseId ||
    'ai-studio-ec2f14b5-11d4-4323-9239-f1b4c77d315a',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    loadedConfig?.storageBucket ||
    'kempt-tiger-b2ts5.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    loadedConfig?.messagingSenderId ||
    '783967465946',
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ||
    loadedConfig?.measurementId ||
    '',
  oAuthClientId:
    import.meta.env.VITE_FIREBASE_OAUTH_CLIENT_ID ||
    loadedConfig?.oAuthClientId ||
    '783967465946-ui5jo3vnush6g7dm3h1chks9rfe5kdke.apps.googleusercontent.com'
};

export default firebaseConfig;
