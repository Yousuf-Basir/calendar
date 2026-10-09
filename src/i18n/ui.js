export const LANGUAGE_STORAGE_KEY = 'calendar-language-v1'

export function readLanguage(storage) {
  try { return storage.getItem(LANGUAGE_STORAGE_KEY) === 'bn' ? 'bn' : 'en' }
  catch { return 'en' }
}

export function saveLanguage(storage, language) {
  try { storage.setItem(LANGUAGE_STORAGE_KEY, language) } catch { /* Storage may be blocked. */ }
}

export const UI = {
  en: {
    title: 'Calendar', menu: 'Open menu', settings: 'Settings', close: 'Close menu', language: 'App language',
    calendarType: 'Calendar type', types: ['English', 'Bangla', 'Arabic'],
    offline: 'Offline', unsynced: 'unsynced', syncing: 'Syncing…', lastSynced: 'Last synced', sync: 'Sync now',
    getApp: 'Get the Calendar app', keep: 'Keep your calendar one tap away.', get: 'Get Calendar',
    icon: 'Calendar app icon', eyebrow: 'YOUR EVERYDAY COMPANION', tagline: 'Make room for your days.',
    features: 'App features', calendars: 'Calendars', always: 'Always with you', free: 'Free', account: 'No account needed',
    description: 'Add Calendar to your home screen. Your dates and Bangladesh holidays, even without internet.',
    add: 'Add Calendar to your device', once: 'Once added, open Calendar from its icon.',
    fallback: 'Use your browser’s menu to add Calendar instead.', opening: 'Opening…', install: 'Install', cancel: 'Cancel',
  },
  bn: {
    title: 'ক্যালেন্ডার', menu: 'মেনু খুলুন', settings: 'সেটিংস', close: 'মেনু বন্ধ করুন', language: 'অ্যাপের ভাষা',
    calendarType: 'ক্যালেন্ডারের ধরন', types: ['ইংরেজি', 'বাংলা', 'আরবি'],
    offline: 'অফলাইন', unsynced: 'সিঙ্ক বাকি', syncing: 'সিঙ্ক হচ্ছে…', lastSynced: 'সর্বশেষ সিঙ্ক', sync: 'এখন সিঙ্ক করুন',
    getApp: 'ক্যালেন্ডার অ্যাপ নিন', keep: 'আপনার ক্যালেন্ডার রাখুন এক স্পর্শের দূরত্বে।', get: 'ক্যালেন্ডার নিন',
    icon: 'ক্যালেন্ডার অ্যাপের আইকন', eyebrow: 'আপনার প্রতিদিনের সঙ্গী', tagline: 'দিনগুলো গুছিয়ে নিন।',
    features: 'অ্যাপের সুবিধা', calendars: 'ক্যালেন্ডার', always: 'সবসময় আপনার সাথে', free: 'বিনামূল্যে', account: 'অ্যাকাউন্ট লাগে না',
    description: 'হোম স্ক্রিনে ক্যালেন্ডার যোগ করুন। ইন্টারনেট ছাড়াই দেখুন তারিখ ও বাংলাদেশের ছুটির দিন।',
    add: 'আপনার ডিভাইসে ক্যালেন্ডার যোগ করুন', once: 'যোগ করার পর আইকন থেকে ক্যালেন্ডার খুলুন।',
    fallback: 'ব্রাউজারের মেনু থেকে ক্যালেন্ডার যোগ করুন।', opening: 'খোলা হচ্ছে…', install: 'ইনস্টল করুন', cancel: 'বাতিল',
  },
}
