// utils/apiAuth.js - NEW FILE
export async function requireAuth(request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }), 
      { status: 401 }
    );
  }
  
  return session;
}