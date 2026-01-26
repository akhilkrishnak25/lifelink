const i18next = require('i18next');

// Initialize i18next
i18next.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      translation: {
        'welcome': 'Welcome to LifeLink',
        'blood_request_created': 'Blood request created successfully',
        'donor_found': 'Donor found nearby',
        'appointment_scheduled': 'Appointment scheduled',
        'donation_completed': 'Thank you for your donation!',
        'profile_updated': 'Profile updated successfully',
        'notifications': {
          'new_request': 'New blood request in your area',
          'match_found': 'You have been matched with a request',
          'appointment_reminder': 'Appointment reminder',
          'achievement_unlocked': 'Achievement unlocked!'
        },
        'errors': {
          'not_found': 'Resource not found',
          'unauthorized': 'Unauthorized access',
          'server_error': 'Internal server error'
        }
      }
    },
    hi: {
      translation: {
        'welcome': 'LifeLink में आपका स्वागत है',
        'blood_request_created': 'रक्त अनुरोध सफलतापूर्वक बनाया गया',
        'donor_found': 'आस-पास दाता मिला',
        'appointment_scheduled': 'नियुक्ति निर्धारित',
        'donation_completed': 'आपके दान के लिए धन्यवाद!',
        'profile_updated': 'प्रोफ़ाइल सफलतापूर्वक अपडेट की गई',
        'notifications': {
          'new_request': 'आपके क्षेत्र में नया रक्त अनुरोध',
          'match_found': 'आपका एक अनुरोध से मिलान किया गया है',
          'appointment_reminder': 'नियुक्ति अनुस्मारक',
          'achievement_unlocked': 'उपलब्धि अनलॉक की गई!'
        },
        'errors': {
          'not_found': 'संसाधन नहीं मिला',
          'unauthorized': 'अनधिकृत पहुंच',
          'server_error': 'आंतरिक सर्वर त्रुटि'
        }
      }
    },
    es: {
      translation: {
        'welcome': 'Bienvenido a LifeLink',
        'blood_request_created': 'Solicitud de sangre creada con éxito',
        'donor_found': 'Donante encontrado cerca',
        'appointment_scheduled': 'Cita programada',
        'donation_completed': '¡Gracias por su donación!',
        'profile_updated': 'Perfil actualizado con éxito'
      }
    }
  }
});

/**
 * Translate text
 */
exports.translate = (key, language = 'en') => {
  return i18next.t(key, { lng: language });
};

/**
 * Change language
 */
exports.changeLanguage = async (language) => {
  await i18next.changeLanguage(language);
};

/**
 * Get supported languages
 */
exports.getSupportedLanguages = () => {
  return [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी (Hindi)' },
    { code: 'es', name: 'Español (Spanish)' }
  ];
};

module.exports.i18next = i18next;
