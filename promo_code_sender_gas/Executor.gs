// Google Play Promo Code manager for Google Apps Script
// trigger by Time
// - watches the Google Group entries
// - sends promo code mail to new-commer
// - sends bcc to admin
// copyright 2025, hanagai

// modify GROUP_EMAIL and APP_NAME
// adds Promotion code into the spread sheet
// set up trigger and give permissions
//
// users may receive mail with a subject like this:
// Jotting[teazt] GIFT CODE 100% discount

// main executor
function executePromoCodeSender() {
  try {
    PromoCodeSender.doPromoCodeSender();
  } catch(e) {
    Logger.log(e);
    PromoCodeSender.sendToAdmin('ERROR', e);
    throw e;
  }
}

// set config
// modify and run this before using
function setProperties() {
  const APP_NAME = 'Jotting';
  const GROUP_EMAIL = 'teazt1@googlegroups.com';
  const GROUP_NAME = `[${GROUP_EMAIL.replace(/@.*$/,'')}]`;
  config = {
    'APP_NAME': APP_NAME,
    'GROUP_EMAIL': GROUP_EMAIL,
    'GROUP_NAME': GROUP_NAME,
    'PROJECT_NAME': `${APP_NAME}${GROUP_NAME}`,
    'ADMIN_EMAIL': PromoCodeSender.getExecutorEmail(),
    'GOOGLE_PLAY_HELP': 'https://support.google.com/googleplay/answer/3422659',
    'CODES_SHEET_NAME': 'codes',
    'EMAILS_SHEET_NAME': 'emails',
    'DISABLE_EMAIL': true,       // enable=null, disable=true
    'DISABLE_GROUPS_APP': true,  // enable=null, disable=true
  };
  PromoCodeSender.setDocProperties(config);
}

// show config
function showProperties() {
  PromoCodeSender.showDocProperties();
}
