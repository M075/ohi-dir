// app/dashboard/messages/page.jsx - ALL USERS
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/utils/authOptions';
import MessagesClient from './MessagesClient';

export default async function MessagesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/auth/signin?callbackUrl=/dashboard/messages');
  }

  return <MessagesClient />;
}