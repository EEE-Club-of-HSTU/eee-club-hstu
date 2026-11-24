// Firestore client module for the EEE Club of HSTU public site.
// Contract: firebase/SCHEMA.md and firebase/firestore.rules
import { firebaseConfig } from './firebase-config.js';

const SDK_VERSION = '12.11.0';
const APP_SDK_URL = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`;
const FIRESTORE_SDK_URL = `https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`;

const ALLOWED_INTERESTS = new Set([
  'mentoring',
  'guest_talks',
  'hiring',
  'donations',
  'events',
  'research',
]);

const ALLOWED_TOPICS = new Set([
  'general',
  'partnership',
  'alumni',
  'media',
  'sponsorship',
]);

const OPTIONAL_ALUMNI_STRINGS = [
  'studentId',
  'phone',
  'currentRole',
  'organization',
  'city',
  'linkedin',
  'message',
];

function isPlaceholder(val) {
  return !val || typeof val !== 'string' || val === 'YOUR_PROJECT_ID' || val.startsWith('YOUR_');
}

const configured = Boolean(
  firebaseConfig &&
  !isPlaceholder(firebaseConfig.projectId) &&
  !isPlaceholder(firebaseConfig.apiKey)
);

let sdkPromise = null;

async function getSdk() {
  if (!configured) return null;
  if (!sdkPromise) {
    sdkPromise = Promise.all([
      import(APP_SDK_URL),
      import(FIRESTORE_SDK_URL),
    ]).then(([appMod, fsMod]) => {
      const existing = appMod.getApps();
      const app = existing.length ? existing[0] : appMod.initializeApp(firebaseConfig);
      const db = fsMod.getFirestore(app);
      return { db, fs: fsMod };
    });
  }
  return sdkPromise;
}

function demoDelay(label) {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ demo: true, id: `demo-${label}` }), 350);
  });
}

async function getEvents() {
  if (!configured) return null;
  try {
    const { db, fs } = await getSdk();
    const q = fs.query(
      fs.collection(db, 'event_logs'),
      fs.where('published', '==', true)
    );
    const snap = await fs.getDocs(q);
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => Date.parse(a.startsAt || '') - Date.parse(b.startsAt || ''));
    return items;
  } catch (err) {
    console.warn('EEEDB.getEvents failed, using fallback:', err);
    return null;
  }
}

async function getNotices() {
  if (!configured) return null;
  try {
    const { db, fs } = await getSdk();
    const q = fs.query(
      fs.collection(db, 'notices'),
      fs.where('published', '==', true)
    );
    const snap = await fs.getDocs(q);
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => {
      const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
      if (pinDiff !== 0) return pinDiff;
      return String(b.noticeDate || '').localeCompare(String(a.noticeDate || ''));
    });
    return items;
  } catch (err) {
    console.warn('EEEDB.getNotices failed, using fallback:', err);
    return null;
  }
}

async function getCertificate(id) {
  if (!configured) return null;
  const cleanId = String(id || '').trim().toUpperCase();
  if (!cleanId) return null;
  const { db, fs } = await getSdk();
  const snap = await fs.getDoc(fs.doc(db, 'certificates', cleanId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function addAlumni(data) {
  if (!configured) return demoDelay('alumni');
  const { db, fs } = await getSdk();
  const gradYear = Number.parseInt(data && data.graduationYear, 10);
  const payload = {
    fullName: String((data && data.fullName) || '').trim(),
    session: String((data && data.session) || '').trim(),
    graduationYear: gradYear,
    email: String((data && data.email) || '').trim(),
    consent: true,
    status: 'pending',
    source: 'website',
    createdAt: fs.serverTimestamp(),
  };

  for (const key of OPTIONAL_ALUMNI_STRINGS) {
    const raw = data && data[key];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      payload[key] = raw.trim();
    }
  }

  if (data && Array.isArray(data.interests)) {
    const cleanInterests = data.interests
      .map((item) => String(item).trim())
      .filter((item) => ALLOWED_INTERESTS.has(item))
      .slice(0, 6);
    if (cleanInterests.length > 0) {
      payload.interests = cleanInterests;
    }
  }

  const ref = await fs.addDoc(fs.collection(db, 'alumni_registrations'), payload);
  return { demo: false, id: ref.id };
}

async function addContact(data) {
  if (!configured) return demoDelay('contact');
  const { db, fs } = await getSdk();
  const topic = String((data && data.topic) || 'general').trim();
  const payload = {
    name: String((data && data.name) || '').trim(),
    email: String((data && data.email) || '').trim(),
    topic: ALLOWED_TOPICS.has(topic) ? topic : 'general',
    message: String((data && data.message) || '').trim(),
    status: 'new',
    createdAt: fs.serverTimestamp(),
  };

  if (data && typeof data.organization === 'string' && data.organization.trim().length > 0) {
    payload.organization = data.organization.trim();
  }

  const ref = await fs.addDoc(fs.collection(db, 'contact_messages'), payload);
  return { demo: false, id: ref.id };
}

async function subscribe(email) {
  if (!configured) return demoDelay('newsletter');
  const { db, fs } = await getSdk();
  const cleanEmail = String(email || '').trim();
  const ref = await fs.addDoc(fs.collection(db, 'newsletter_subscribers'), {
    email: cleanEmail,
    createdAt: fs.serverTimestamp(),
  });
  return { demo: false, id: ref.id };
}

const api = {
  configured,
  getEvents,
  getNotices,
  getCertificate,
  addAlumni,
  addContact,
  subscribe,
};

window.EEEDB = api;
window.dispatchEvent(new CustomEvent('eeedb:ready', { detail: api }));
