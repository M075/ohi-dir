import { google } from 'googleapis';

// Initialize Google Drive client
const initGoogleDrive = () => {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
    
    return google.drive({ version: 'v3', auth });
  } catch (error) {
    console.error('Error initializing Google Drive client:', error);
    throw new Error('Failed to initialize Google Drive client');
  }
};

// List files from Google Drive
const listFiles = async (options = {}) => {
  const {
    pageSize = 10,
    pageToken = null,
    query = null,
    fields = 'nextPageToken, files(id, name, mimeType, webViewLink, webContentLink, createdTime, size)',
    orderBy = 'createdTime desc'
  } = options;

  try {
    const drive = initGoogleDrive();
    
    const params = {
      pageSize,
      orderBy,
      fields,
      ...(pageToken && { pageToken }),
      ...(query && { q: query })
    };

    const response = await drive.files.list(params);
    
    return {
      files: response.data.files,
      nextPageToken: response.data.nextPageToken
    };
  } catch (error) {
    console.error('Error listing files:', error);
    throw new Error('Failed to list files from Google Drive');
  }
};

// GET handler to list files
export async function GET(request) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const pageSize = parseInt(searchParams.get('pageSize')) || 10;
    const pageToken = searchParams.get('pageToken');
    const query = searchParams.get('query');
    
    const result = await listFiles({
      pageSize,
      pageToken,
      query
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

// DELETE handler to remove a file
export async function DELETE(request) {
  try {
    const { fileId } = await request.json();
    
    if (!fileId) {
      return new Response(JSON.stringify({ error: 'File ID is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    const drive = initGoogleDrive();
    await drive.files.delete({ fileId });

    return new Response(JSON.stringify({ message: 'File deleted successfully' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Delete Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}