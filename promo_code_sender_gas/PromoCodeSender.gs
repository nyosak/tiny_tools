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

const DONE = 1;
const NEW_TO_SEND = 0;

// main
function doPromoCodeSender() {
  const group_email = getDocP('GROUP_EMAIL');
  const emails_sheet = getSheet(getDocP('EMAILS_SHEET_NAME'));
  const codes_sheet = getSheet(getDocP('CODES_SHEET_NAME'));
  const users = getGroupMembers(group_email, emails_sheet);
  updateEmailsSheet(emails_sheet, users);
  updateCodesSheet(codes_sheet, users);
  sendCode(codes_sheet);
}

// returns current member emails of Google groups by group email
function getGroupMembers(group_email, emails_sheet) {
  if(getDocP('DISABLE_GROUPS_APP')) {
    Logger.log('WARN: GroupsApp is disabled. Using the sheet instead.')
    return getGroupMembersFromSheet(emails_sheet);
  } else {
    return getGroupMembersByApi(group_email);
  }
}

// returns current member emails from sheet itself
// only for urgent. e.g. all quota gone.
function getGroupMembersFromSheet(sheet) {
  const lastRow = sheet.getLastRow();
  const users = sheet.getRange(1, 1, lastRow).getValues().flat();
  Logger.log(users.join(','));
  return users;
}

// returns current member emails of Google groups by group email
// quota reading: 2,000 / day	
function getGroupMembersByApi(group_email) {
  const group = GroupsApp.getGroupByEmail(group_email);
  const users = group.getUsers();
  Logger.log(`Group ${group_email} has ${users.length} members`);
  return users;
}

// replace email list at `emails` sheet
function updateEmailsSheet(sheet, users) {
  // clear sheet
  sheet.clear();
  // add users
  const size = users.length;
  Logger.log(`size: ${size}`);
  // make nested array for range values
  let values = [];
  users.forEach(user => {
    values.push([user]);
  });
  if(size > 0){
    sheet.getRange(1, 1, size).setValues(values);
  }
  SpreadsheetApp.flush();
}

// add new members into `codes` sheet
function updateCodesSheet(sheet, users) {
  // get emails registered
  const lastRow = Math.max(2, sheet.getLastRow());
  const emails = sheet.getRange(2, 2, lastRow - 1).getValues().flat();
  // this array includes blank strings, but it will be not hurt.
  //Logger.log(emails.length);
  //Logger.log(emails.reduce(function(a, email){return `${a},${email}`;},''));
  //Logger.log(emails.join(','));
  //Logger.log(emails.reduce(function(a, email){return `${a},${Object.prototype.toString.call(email)}`;},''));

  // get new-comers
  let new_emails = [];
  users.forEach(user => {
    Logger.log(`${user}, ${Object.prototype.toString.call(user)}`)
    //if(!emails.includes(user)) {
    // includes is not properly supported
    if(-1 == emails.findIndex(function(email){return email == user})) {     
      // new-comer found 
      new_emails.push(user);
    }
  });
  Logger.log(`new-comers: ${new_emails.join(',')}`);

  // add new-comers into sheet
  const size = new_emails.length;
  if(size > 0) {
    for (let r = 2; r <= lastRow + size; r++) {
      const row = sheet.getRange(r, 2, 1, 2);  // Email, Sent
      const email = row.getCell(1, 1).getValue();
      const sent = row.getCell(1, 2).getValue();
      Logger.log(`NEW: row: ${r}, Email: ${email}, Sent: ${sent}`)
      if(email == '' && sent != DONE) {
        row.getCell(1, 1).setValue(new_emails.shift());
        row.getCell(1, 2).setValue(NEW_TO_SEND);
        if(new_emails.length == 0) break;
      }
    }
    SpreadsheetApp.flush();
    sendToAdmin(
      0 == new_emails.length ? 'NEW': 'NEW ERROR',
      `${size} new-comers found.\n${new_emails.join(',')}`
    )
  }
}

// send promo code to new-commers
function sendCode(sheet) {
  // get entries
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  const entries = sheet.getRange(2, 1, lastRow - 1, lastColumn);

  // scan each row and send if required
  for (let r = 2; r <= lastRow; r++) {
    const row = sheet.getRange(r, 1, 1, lastColumn);  // Promo, Email, Sent, Time
    const values = row.getValues().flat();
    Logger.log(`row: ${r}`);
    //Logger.log(values.join(','));
    //Logger.log(values[2]);
    
    if(NEW_TO_SEND === values[2]) {
      Logger.log(`SEND: row: ${r}, ${values.join(',')}`);

      const promo = values[0];
      const email = values[1];
      Logger.log(`promo: ${promo}, email: ${email}`);
      if('' == promo) {
        throw `promo code is out of stock at ${r}`
      }

      const now = new Date();
      sendPromoCode(email, promo, now);
      row.getCell(1, 3).setValue(DONE);
      row.getCell(1, 4).setValue(now);

      // to predict filled over
      if(r == lastRow) {
        sendToAdmin(
          'WARN stock may become zero',
          `row: ${r}`
        )
      }
    }
  }
  SpreadsheetApp.flush();
}

// send message to admin (myself)
function sendToAdmin(subject, body) {
  const admin = getDocP('ADMIN_EMAIL');
  const group_name = getDocP('GROUP_NAME');
  const now = new Date();
  sendEmail(
    admin,
    `${group_name} ${subject}`,
    `${now.toString()}\n${body}`,
  );
}

// send promo code with bcc admin
function sendPromoCode(email, code, now) {
  const admin = getDocP('ADMIN_EMAIL');
  const project_name = getDocP('PROJECT_NAME');
  const options = {
    bcc: admin,
    name: project_name
  };
  const google_play_help = getDocP('GOOGLE_PLAY_HELP');
  const subject = `${project_name} GIFT CODE 100% discount`;
  const body = `  Thank you for joining the test. 
  
  Gift Code: ${code}
  Issued at: ${now.toString()}

  Before installing the app, make sure you enter this Gift Code 
  into your Google Play app, please. 
  After redeeming the code, you will get the app for FREE. 

  Follow the link below to redeem the Gift Code:
  ${deepLinkPromoCode(code)}

  Refer to this help article for further instructions:
  ${google_play_help} 

  ---
  テストにご参加いただきありがとうございます。

  ギフトコード: ${code}  
  発行日時: ${now.toString()}

  アプリをインストールする前に、このギフトコードを
  Google Playアプリに入力してください。  
  コードを引き換えると、アプリを無料で入手できます。

  以下のリンクからギフトコードを引き換えてください。  
  ${deepLinkPromoCode(code)}

  詳しい手順については、以下のヘルプ記事をご参照ください。  
  ${google_play_help}?hl=ja
  `;

  sendEmail(
    email, subject, body, options
  );
}

/**
 * deep link for promo code
 * @param {string} code Promo code
 * @return {string} Google Play deeplink to redeem the promo code
 */
function deepLinkPromoCode(code) {
  // https://developer.android.com/google/play/billing/promo#deep-link
  return `https://play.google.com/redeem?code=${code}`;
}

/***
 * commonly used low level functions
 ***/

// get sheet by name
function getSheet(sheet_name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheet_name);
  if (sheet == null) {
    throw `sheet not found: ${sheet_name}`;
  }
  Logger.log(`sheet ${sheet_name} index: ${sheet.getIndex()}`);
  return sheet;
}

// send email
function sendEmail(email, subject, body, options={}) {
  if(getDocP('DISABLE_EMAIL')) {
    Logger.log('DISABLE_EMAIL: %s, %s\n%s\n%s', email, subject, body, options);
  } else {
    GmailApp.sendEmail(
      email, subject, body, options
    );
  }
}

// email address of script executor
function getExecutorEmail() {
  const email = Session.getActiveUser().getEmail();
  Logger.log(`executor: ${email}`);
  return email;
}

// set document properties
function setDocProperties(properties) {
  PropertiesService.getDocumentProperties().setProperties(properties);
}

// get document properties
function getDocProperties() {
  return PropertiesService.getDocumentProperties().getProperties();
}

// get document property
function getDocP(key) {
  return PropertiesService.getDocumentProperties().getProperty(key);
}

// show document property list to log
function showDocProperties() {
  properties = getDocProperties();
  Object.keys(properties).forEach(function(k){
    Logger.log('%s: %s', k, properties[k]);
  });
}

