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

const ALLOWED_STATIC_PAGES = new Set(['constitution', 'history', 'privacy', 'terms']);
const ALLOWED_SETTINGS = new Set(['footer', 'location']);
const settingsCache = new Map();

async function getPublishedDocs(collectionName, label) {
  if (!configured) return null;
  try {
    const { db, fs } = await getSdk();
    const q = fs.query(
      fs.collection(db, collectionName),
      fs.where('published', '==', true)
    );
    const snap = await fs.getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn(`EEEDB.${label} failed, using fallback:`, err);
    return null;
  }
}

async function getEvents() {
  const items = await getPublishedDocs('event_logs', 'getEvents');
  if (!items) return null;
  items.sort((a, b) => Date.parse(a.startsAt || '') - Date.parse(b.startsAt || ''));
  return items;
}

async function getNotices() {
  const items = await getPublishedDocs('notices', 'getNotices');
  if (!items) return null;
  items.sort((a, b) => {
    const pinDiff = Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
    if (pinDiff !== 0) return pinDiff;
    return String(b.noticeDate || '').localeCompare(String(a.noticeDate || ''));
  });
  return items;
}

async function getBlogs() {
  const items = await getPublishedDocs('blogs', 'getBlogs');
  if (!items) return null;
  items.sort((a, b) => String(b.publishedOn || '').localeCompare(String(a.publishedOn || '')));
  return items;
}

async function getBlog(id) {
  if (!configured) return null;
  const cleanId = String(id || '').trim();
  if (!cleanId) return null;
  try {
    const { db, fs } = await getSdk();
    const snap = await fs.getDoc(fs.doc(db, 'blogs', cleanId));
    if (!snap.exists()) return null;
    const data = snap.data();
    return data && data.published === true ? { id: snap.id, ...data } : null;
  } catch (err) {
    console.warn('EEEDB.getBlog failed, using fallback:', err);
    return null;
  }
}

async function getMembers(category) {
  const items = await getPublishedDocs('leadership_members', 'getMembers');
  if (!items) return null;
  items.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  if (typeof category === 'string' && category.trim()) {
    const cat = category.trim();
    return items.filter((m) => m.category === cat);
  }
  return items;
}

async function getGallery() {
  const items = await getPublishedDocs('gallery_items', 'getGallery');
  if (!items) return null;
  items.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  return items;
}

async function getMagazines() {
  const items = await getPublishedDocs('magazines', 'getMagazines');
  if (!items) return null;
  items.sort((a, b) => (Number(b.issueNumber) || 0) - (Number(a.issueNumber) || 0));
  return items;
}

async function getResources() {
  const items = await getPublishedDocs('resources', 'getResources');
  if (!items) return null;
  items.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
  return items;
}

async function getFaqs() {
  const items = await getPublishedDocs('faqs', 'getFaqs');
  if (!items) return null;
  items.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  return items;
}

async function getPartners() {
  const items = await getPublishedDocs('partners', 'getPartners');
  if (!items) return null;
  items.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
  return items;
}

async function getPage(id) {
  if (!configured) return null;
  const cleanId = String(id || '').trim();
  if (!ALLOWED_STATIC_PAGES.has(cleanId)) return null;
  try {
    const { db, fs } = await getSdk();
    const snap = await fs.getDoc(fs.doc(db, 'pages_static', cleanId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.warn(`EEEDB.getPage(${cleanId}) failed, using fallback:`, err);
    return null;
  }
}

async function getSettings(id) {
  if (!configured) return null;
  const cleanId = String(id || '').trim();
  if (!ALLOWED_SETTINGS.has(cleanId)) return null;
  if (settingsCache.has(cleanId)) return settingsCache.get(cleanId);
  const promise = (async () => {
    try {
      const { db, fs } = await getSdk();
      const snap = await fs.getDoc(fs.doc(db, 'site_settings', cleanId));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (err) {
      console.warn(`EEEDB.getSettings(${cleanId}) failed, using fallback:`, err);
      return null;
    }
  })();
  settingsCache.set(cleanId, promise);
  return promise;
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
  getBlogs,
  getBlog,
  getMembers,
  getGallery,
  getMagazines,
  getResources,
  getFaqs,
  getPartners,
  getPage,
  getSettings,
  getCertificate,
  addAlumni,
  addContact,
  subscribe,
};

window.EEEDB = api;
window.dispatchEvent(new CustomEvent('eeedb:ready', { detail: api }));
