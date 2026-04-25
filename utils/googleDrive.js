import { google } from 'googleapis';

export const getGoogleDriveClient = () => {
  const credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });
  
  return google.drive({ version: 'v3', auth });
};