import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  PrayerPerson,
  PrayerRequestItem,
  PrayerSessionLog,
} from '../../types';
import {
  subscribeToPrayerPeople,
  subscribeToAllUserPrayerRequests,
  savePrayerPerson,
  deletePrayerPerson,
  savePrayerRequest,
  deletePrayerRequest,
  ensurePrayerJournalAppDocument,
  logPrayerSession,
  migrateLegacyPrayerData,
} from '../../services/prayerFirestoreService';
import { PrayerPeopleLandingView } from './PrayerPeopleLandingView';
import { PersonPrayerRequestsView } from './PersonPrayerRequestsView';
import { PrayerRequestDetailView } from './PrayerRequestDetailView';
import { Loader2 } from 'lucide-react';

interface PrayerJournalAppProps {
  onBackToHub?: () => void;
}

export const PrayerJournalApp: React.FC<PrayerJournalAppProps> = ({ onBackToHub }) => {
  const { user, userRole, displayName } = useAuth();
  const userId = user?.uid || 'guest_user';
  const userEmail = user?.email || undefined;
  const userName = displayName || user?.displayName || user?.email?.split('@')[0] || 'Intercessor';
  const roleStr = userRole || undefined;

  // Navigation State
  const [currentView, setCurrentView] = useState<'landing' | 'person' | 'request_detail'>('landing');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);

  // Data State
  const [people, setPeople] = useState<PrayerPerson[]>([]);
  const [requests, setRequests] = useState<PrayerRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Initialize app doc in Firestore & run migration check
  useEffect(() => {
    ensurePrayerJournalAppDocument();
    if (userId && userId !== 'guest_user') {
      migrateLegacyPrayerData(userId, userEmail);
    }
  }, [userId, userEmail]);

  // Subscribe to real-time people
  useEffect(() => {
    setLoading(true);
    const unsubscribePeople = subscribeToPrayerPeople(
      userId,
      userEmail,
      (data) => {
        setPeople(data);
        setLoading(false);
      },
      (err) => {
        console.warn('subscribeToPrayerPeople notice:', err);
        setLoading(false);
      }
    );

    const unsubscribeRequests = subscribeToAllUserPrayerRequests(
      userId,
      userEmail,
      (data) => {
        setRequests(data);
      },
      (err) => {
        console.warn('subscribeToAllUserPrayerRequests notice:', err);
      }
    );

    return () => {
      unsubscribePeople();
      unsubscribeRequests();
    };
  }, [userId, userEmail]);

  // Handlers
  const handleSelectPerson = useCallback((personId: string) => {
    setSelectedPersonId(personId);
    setCurrentView('person');
  }, []);

  const handleSelectRequest = useCallback((requestId: string) => {
    setSelectedRequestId(requestId);
    setCurrentView('request_detail');
  }, []);

  const handleBackToLanding = useCallback(() => {
    setSelectedPersonId(null);
    setSelectedRequestId(null);
    setCurrentView('landing');
  }, []);

  const handleBackToPerson = useCallback(() => {
    setSelectedRequestId(null);
    setCurrentView('person');
  }, []);

  const handleSavePerson = async (person: PrayerPerson) => {
    await savePrayerPerson(person);
  };

  const handleDeletePerson = async (personId: string) => {
    await deletePrayerPerson(personId, userId);
    if (selectedPersonId === personId) {
      handleBackToLanding();
    }
  };

  const handleSaveRequest = async (req: PrayerRequestItem) => {
    await savePrayerRequest(req);
  };

  const handleDeleteRequest = async (requestId: string) => {
    await deletePrayerRequest(requestId);
    if (selectedRequestId === requestId) {
      handleBackToPerson();
    }
  };

  const handleQuickPray = async (req: PrayerRequestItem) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const session: PrayerSessionLog = {
      id: `quick_session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: todayStr,
      timestamp: new Date().toISOString(),
      prayedBy: userName,
      prayedByEmail: userEmail,
      prayedByRole: roleStr,
    };
    await logPrayerSession(req.id, req, session);
  };

  const selectedPerson = people.find((p) => p.id === selectedPersonId);
  const selectedRequest = requests.find((r) => r.id === selectedRequestId);
  const personRequests = selectedPersonId
    ? requests.filter((r) => r.personId === selectedPersonId)
    : [];

  if (loading && people.length === 0) {
    return (
      <div className="min-h-screen bg-[#0B0A16] flex flex-col items-center justify-center text-slate-300 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
        <span className="text-xs text-slate-400">Loading your Prayer Journal...</span>
      </div>
    );
  }

  // View Routing
  if (currentView === 'request_detail' && selectedRequest && selectedPerson) {
    return (
      <PrayerRequestDetailView
        request={selectedRequest}
        person={selectedPerson}
        onBack={handleBackToPerson}
        onUpdateRequest={handleSaveRequest}
        onDeleteRequest={handleDeleteRequest}
        currentUserId={userId}
        currentUserName={userName}
        currentUserEmail={userEmail}
        currentUserRole={roleStr}
      />
    );
  }

  if (currentView === 'person' && selectedPerson) {
    return (
      <PersonPrayerRequestsView
        person={selectedPerson}
        requests={personRequests}
        onBack={handleBackToLanding}
        onSelectRequest={handleSelectRequest}
        onSaveRequest={handleSaveRequest}
        onQuickPray={handleQuickPray}
        onSavePerson={handleSavePerson}
        onDeletePerson={handleDeletePerson}
        currentUserId={userId}
        currentUserEmail={userEmail}
        currentUserName={userName}
        currentUserRole={roleStr}
      />
    );
  }

  // Default: Landing page (List of People)
  return (
    <PrayerPeopleLandingView
      people={people}
      allRequests={requests}
      onBackToHub={onBackToHub || (() => { window.location.hash = ''; })}
      onSelectPerson={handleSelectPerson}
      onSavePerson={handleSavePerson}
      onDeletePerson={handleDeletePerson}
      currentUserId={userId}
      currentUserEmail={userEmail}
      currentUserName={userName}
    />
  );
};
