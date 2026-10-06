import rawConfig from '../../firebase-applet-config.json';

export const firebaseConfig = {
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    rawConfig?.projectId ||
    'kempt-tiger-b2ts5',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    rawConfig?.appId ||
    '1:783967465946:web:3fd8c9f41f255a8043d0e3',
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    rawConfig?.apiKey ||
    'AIzaSyAkn_e57lVoMt8qlq2WfklLuzZCrcPd7os',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    rawConfig?.authDomain ||
    'kempt-tiger-b2ts5.firebaseapp.com',
  firestoreDatabaseId:
    import.meta.env.VITE_FIREBASE_DATABASE_ID ||
    rawConfig?.firestoreDatabaseId ||
    'ai-studio-ec2f14b5-11d4-4323-9239-f1b4c77d315a',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    rawConfig?.storageBucket ||
    'kempt-tiger-b2ts5.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    rawConfig?.messagingSenderId ||
    '783967465946',
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ||
    rawConfig?.measurementId ||
    '',
  oAuthClientId:
    import.meta.env.VITE_FIREBASE_OAUTH_CLIENT_ID ||
    rawConfig?.oAuthClientId ||
    '783967465946-ui5jo3vnush6g7dm3h1chks9rfe5kdke.apps.googleusercontent.com'
};

export default firebaseConfig;
