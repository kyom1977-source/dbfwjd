// Firebase client configuration with environment variable support and default cloud project

export const firebaseConfig = {
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID || 'kempt-tiger-b2ts5',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID || '1:783967465946:web:3fd8c9f41f255a8043d0e3',
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyAkn_e57lVoMt8qlq2WfklLuzZCrcPd7os',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'kempt-tiger-b2ts5.firebaseapp.com',
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-ec2f14b5-11d4-4323-9239-f1b4c77d315a',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'kempt-tiger-b2ts5.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '783967465946',
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
  oAuthClientId:
    import.meta.env.VITE_FIREBASE_OAUTH_CLIENT_ID || '783967465946-ui5jo3vnush6g7dm3h1chks9rfe5kdke.apps.googleusercontent.com'
};

export default firebaseConfig;
